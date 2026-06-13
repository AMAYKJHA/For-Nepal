from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count, Avg
from django.db.models.expressions import RawSQL
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from rest_framework import status
from django.db import transaction
import time
from .utils import generate_memory_summary, groq_client, MODELS, DEFAULT_MODEL
from .models import (
    Memory, Flashcard, ChatSession, ChatMessage,
    PDFDocument, PDFChunk, PDFQuiz,
    TopicMastery, ReviewLog, QuizAttempt,
)
from .serializers import (
    MemorySerializer, FlashcardSerializer, ChatSessionSerializer,
    ChatMessageSerializer, ChatRequestSerializer,
    SearchRequestSerializer, SummarizeRequestSerializer,
    ReviewSubmitSerializer, TopicMasterySerializer,
)
from .utils import (
    detect_topic, generate_embedding,
    get_groq_response, generate_summary, generate_flashcard, generate_memory_summary,
    groq_client,
    extract_text_by_page, chunk_pages, embed_text, generate_quiz_for_level,
    sm2_schedule, mastery_from_counts, extract_learning_structure,
)
import traceback
from pgvector.django import CosineDistance
from .tasks import process_pdf_upload_task, generate_flashcards_task


DIFFICULTY_TO_QUALITY = {
    'again': 0,
    'hard': 3,
    'good': 4,
    'easy': 5,
}

LEVELS = ["beginner", "intermediate", "advanced", "expert"]
PASS_THRESHOLD = 80


def update_topic_mastery(topic: str, is_correct: bool):
    mastery, _ = TopicMastery.objects.get_or_create(topic=topic or 'General')
    if is_correct:
        mastery.correct_answers += 1
    else:
        mastery.incorrect_answers += 1
    mastery.mastery_score = mastery_from_counts(mastery.correct_answers, mastery.incorrect_answers)
    mastery.save()


def get_priority_topics(limit=3):
    weak = list(TopicMastery.objects.order_by('mastery_score').values_list('topic', flat=True)[:limit])
    recent_failed = list(
        QuizAttempt.objects.filter(score__lt=60)
        .order_by('-created_at')
        .values_list('topic', flat=True)[:limit]
    )
    overdue_topics = list(
        Flashcard.objects.filter(next_review_date__lt=timezone.localdate())
        .values_list('memory__topic', flat=True)
        .distinct()[:limit]
    )

    topics = []
    for source in [weak, recent_failed, overdue_topics]:
        for t in source:
            if t and t not in topics:
                topics.append(t)
    return topics


class FormatMemoryView(APIView):
    def post(self, request):
        question = request.data.get('question', '')
        answer   = request.data.get('answer', '')

        prompt = f"""Reformat this Q&A as clean plain text for a PDF report.
Rules:
- No markdown: no **, *, #, >, backticks, or dashes
- No bullet symbols, use numbered points like 1. 2. 3. if needed
- Question: one clear concise sentence
- Answer: well structured paragraphs, max 120 words, plain English

QUESTION: {question}
ANSWER: {answer}

Reply ONLY with valid JSON, no extra text:
{{"question": "...", "answer": "..."}}"""

        try:
            import json
            response = groq_client.chat.completions.create(
                model=MODELS[DEFAULT_MODEL]['id'],
                messages=[{'role': 'user', 'content': prompt}],
                max_tokens=400,
                temperature=0.3,
            )
            text = response.choices[0].message.content.strip()
            text = text.replace('```json', '').replace('```', '').strip()
            data = json.loads(text)
            return Response({'question': data['question'], 'answer': data['answer']})
        except Exception as e:
            return Response({'question': question, 'answer': answer})


class ModelsView(APIView):
    def get(self, request):
        return Response([
            {
                'key':         key,
                'label':       m['label'],
                'description': m['description'],
            }
            for key, m in MODELS.items()
        ])


class ChatView(APIView):
    # permission_classes = [IsAuthenticated]  # FIX: enforces auth so request.user is never null

    def post(self, request):
        try:
            serializer = ChatRequestSerializer(data=request.data)

            if not serializer.is_valid():
                return Response(serializer.errors, status=400)

            data = serializer.validated_data
            user_message = data.get("message", "").strip()
            history = data.get("conversation_history", [])
            tutor_mode = data.get("tutor_mode", False)

            if not user_message:
                return Response({"error": "Message is empty"}, status=400)

            model_key = request.data.get("model", DEFAULT_MODEL)
            if model_key not in MODELS:
                model_key = DEFAULT_MODEL

            # ── Topic detection ─────────────────────
            topic = detect_topic(user_message)

            # ── Embedding generation ────────────────
            query_embedding = generate_embedding(user_message)

            past_memories = []

            # ── Vector search ───────────────────────
            if query_embedding:
                try:
                    past_memories = list(
                        Memory.objects
                        .filter(embedding__isnull=False)
                        .annotate(distance=CosineDistance("embedding", query_embedding))
                        .order_by("distance")[:5]
                    )
                except Exception as e:
                    print("Vector search failed:", e)
                    past_memories = []

            # ── Fallback keyword search ─────────────
            if not past_memories:
                past_memories = list(
                    Memory.objects
                    .filter(topic=topic)
                    .order_by("-created_at")[:3]
                )

            # ── Build context ───────────────────────
            context = ""
            if past_memories:
                context = "\n\nRelevant past knowledge:\n"
                for m in past_memories:
                    context += f"Q: {m.question}\nA: {m.answer[:300]}\n\n"

            weak_topics = list(
                TopicMastery.objects
                .order_by('mastery_score')
                .values_list('topic', flat=True)[:3]
            )
            overdue_reviews = Flashcard.objects.filter(next_review_date__lte=timezone.localdate()).count()
            recent_mistakes = QuizAttempt.objects.filter(score__lt=60).order_by('-created_at')[:5].count()

            learning_context = (
                f"\n\nLearning state:\n"
                f"- Weak topics: {', '.join(weak_topics) if weak_topics else 'None yet'}\n"
                f"- Overdue reviews: {overdue_reviews}\n"
                f"- Recent low-score quiz attempts: {recent_mistakes}\n"
            )

            system_prompt = (
                "You are ManageAI, a friendly AI assistant with memory. "
                "Be clear, helpful, and concise. Use markdown when appropriate."
                + context
                + learning_context
            )

            if tutor_mode:
                system_prompt += (
                    "\n\nSocratic Tutor Mode is enabled. Do not reveal full solutions immediately. "
                    "Start by asking 1-2 guiding questions, give hints progressively, "
                    "and only provide direct answers after checking the learner's reasoning."
                )

            # ── Chat messages ───────────────────────
            messages = history[-10:] + [
                {"role": "user", "content": user_message}
            ]

            # ── Get AI response ─────────────────────
            answer = get_groq_response(messages, system_prompt, model_key)

            # ── Embedding for storage ───────────────
            embedding = generate_embedding(user_message + " " + answer)

            if embedding and len(embedding) != 3072:  # FIX: was 768, gemini-embedding-001 = 3072
                embedding = None

            summary = generate_memory_summary(user_message, answer)
            importance_score = 0.75 if len(user_message) > 120 or topic in weak_topics else 0.55

            # ── Save memory ─────────────────────────
            memory = Memory.objects.create(
                # user=request.user,
                question=user_message,
                answer=answer,
                topic=topic,
                summary=summary,
                importance_score=importance_score,
                learning_progress={
                    'context_used': bool(past_memories),
                    'tutor_mode': tutor_mode,
                    'weak_topic_focus': topic in weak_topics,
                },
                embedding=embedding,
            )

            return Response({
                "answer": answer,
                "memory_id": str(memory.id),
                "topic": topic,
                "context_used": bool(past_memories),
                "model_used": MODELS[model_key]["label"],
            })

        except Exception as e:
            print("ChatView error:", str(e))
            return Response(
                {"error": "Internal server error", "detail": str(e)},
                status=500,
            )


class MemoryListView(APIView):
    def get(self, request):
        topic    = request.query_params.get('topic')
        memories = Memory.objects.all()
        if topic:
            memories = memories.filter(topic=topic)
        return Response(MemorySerializer(memories, many=True).data)

    def delete(self, request):
        memory_id = request.query_params.get('id')
        if not memory_id:
            return Response({'error': 'id required'}, status=400)
        Memory.objects.filter(id=memory_id).delete()
        return Response({'success': True})


class SearchView(APIView):
    def post(self, request):
        serializer = SearchRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        query           = serializer.validated_data['query']
        query_embedding = generate_embedding(query)

        if query_embedding:
            # FIX: chained the queryset on one expression — no dangling dot on new line
            memories = (
                Memory.objects
                .filter(embedding__isnull=False)
                .annotate(distance=CosineDistance("embedding", query_embedding))
                .filter(distance__lt=0.4)
                .order_by('distance')[:20]
            )
        else:
            memories = Memory.objects.filter(
                Q(question__icontains=query) | Q(answer__icontains=query)
            )[:20]

        mastery_scores = {
            m.topic: m.mastery_score
            for m in TopicMastery.objects.all()
        }

        ranked = sorted(
            memories,
            key=lambda m: (
                float(getattr(m, 'distance', 0.35))
                - float(getattr(m, 'importance_score', 0.5)) * 0.15
                + (mastery_scores.get(m.topic, 50.0) / 100.0) * 0.05
            )
        )[:10]

        return Response(MemorySerializer(ranked, many=True).data)


class SummarizeView(APIView):
    def post(self, request):
        serializer = SummarizeRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        try:
            memory = Memory.objects.get(id=serializer.validated_data['memory_id'])
        except Memory.DoesNotExist:
            return Response({'error': 'Memory not found'}, status=404)

        fc_data   = generate_flashcard(memory.question, memory.answer)
        flashcard = Flashcard.objects.create(
            memory=memory, front=fc_data['front'], back=fc_data['back']
        )
        return Response(FlashcardSerializer(flashcard).data)


class FlashcardListView(APIView):
    def get(self, request):
        subject = (request.query_params.get('subject') or '').strip()
        flashcards = Flashcard.objects.all()
        if subject:
            flashcards = flashcards.filter(
                Q(memory__topic__iexact=subject)
                | Q(front__icontains=subject)
                | Q(back__icontains=subject)
                | Q(memory__question__icontains=subject)
                | Q(memory__answer__icontains=subject)
            )
        return Response(FlashcardSerializer(flashcards, many=True).data)


class TodayReviewsView(APIView):
    def get(self, request):
        today = timezone.localdate()
        reviews = Flashcard.objects.filter(next_review_date__lte=today).order_by('next_review_date', 'created_at')
        return Response(FlashcardSerializer(reviews, many=True).data)


class SubmitReviewView(APIView):
    def post(self, request):
        serializer = ReviewSubmitSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        card_id = serializer.validated_data['flashcard_id']
        difficulty = serializer.validated_data['difficulty']
        quality = DIFFICULTY_TO_QUALITY[difficulty]

        try:
            flashcard = Flashcard.objects.get(id=card_id)
        except Flashcard.DoesNotExist:
            return Response({'error': 'Flashcard not found'}, status=404)

        state = sm2_schedule(flashcard, quality)
        flashcard.ease_factor = state['ease_factor']
        flashcard.interval_days = state['interval_days']
        flashcard.repetition_count = state['repetition_count']
        flashcard.last_review_date = state['last_review_date']
        flashcard.next_review_date = state['next_review_date']
        flashcard.save()

        ReviewLog.objects.create(flashcard=flashcard, rating=quality)
        update_topic_mastery(flashcard.memory.topic, quality >= 3)

        return Response({'flashcard': FlashcardSerializer(flashcard).data})


class TopicMasteryView(APIView):
    def get(self, request):
        mastery = TopicMastery.objects.all().order_by('mastery_score')
        return Response(TopicMasterySerializer(mastery, many=True).data)


class LearningAnalyticsView(APIView):
    def get(self, request):
        total_topics = TopicMastery.objects.count()
        struggling_topics = TopicMastery.objects.filter(mastery_score__lt=60).count()
        avg_mastery = TopicMastery.objects.aggregate(avg=Avg('mastery_score'))['avg'] or 0

        quiz_attempts = QuizAttempt.objects.all()
        total_quizzes = quiz_attempts.count()
        quiz_accuracy = quiz_attempts.aggregate(avg=Avg('score'))['avg'] or 0

        reviewed_count = ReviewLog.objects.count()
        due_count = Flashcard.objects.filter(next_review_date__lte=timezone.localdate()).count()
        revision_completion_rate = 0 if reviewed_count + due_count == 0 else round((reviewed_count / (reviewed_count + due_count)) * 100, 2)

        active_days = set()
        for ts in Memory.objects.values_list('created_at', flat=True):
            active_days.add(ts.date())
        for ts in ReviewLog.objects.values_list('reviewed_at', flat=True):
            active_days.add(ts.date())

        streak = 0
        cursor = timezone.localdate()
        while cursor in active_days:
            streak += 1
            cursor = cursor - timedelta(days=1)

        return Response({
            'mastery_score': round(avg_mastery, 2),
            'topics_learned': total_topics,
            'topics_struggling': struggling_topics,
            'quiz_accuracy': round(quiz_accuracy, 2),
            'revision_completion_rate': revision_completion_rate,
            'flashcards_reviewed': reviewed_count,
            'study_streak': streak,
            'topic_mastery': TopicMasterySerializer(TopicMastery.objects.all().order_by('topic'), many=True).data,
        })


class ConceptMapView(APIView):
    def post(self, request):
        source = request.data.get('source', 'memories')
        limit = min(int(request.data.get('limit', 15)), 30)

        mermaid_rules = (
            "\n\nCRITICAL MERMAID SYNTAX RULES (Violating these breaks the app):"
            "\n1. Node IDs MUST be simple alphanumeric without spaces (e.g., A, B1). Never use spaces in node IDs."
            "\n2. Node text labels MUST be wrapped in double quotes to protect special chars: A[\"Valid (Text)\"]."
            "\n3. Edges with labels MUST use this exact format: A -->|depends on| B"
            "\n4. NEVER use malformed arrows like `-->|requires|>B`."
            "\n5. ONLY output the valid Mermaid code starting with `graph TD`. No markdown fences, no explanations."
        )

        if source == 'pdf':
            # Get all PDFs or a specific one
            pdf_id = request.data.get('pdf_id')
            if pdf_id:
                try:
                    doc = PDFDocument.objects.get(id=pdf_id)
                    pdfs = [doc]
                except PDFDocument.DoesNotExist:
                    return Response({'error': 'PDF not found'}, status=404)
            else:
                pdfs = list(PDFDocument.objects.all().order_by('-uploaded_at')[:3])
            
            if not pdfs:
                return Response({'error': 'No PDFs available. Upload a PDF first.'}, status=400)
            
            content_parts = []
            for doc in pdfs:
                summary = doc.summary or ''
                concepts = ', '.join(doc.concepts) if doc.concepts else ''
                # Get chunks for deeper hierarchy
                chunks = PDFChunk.objects.filter(document=doc).order_by('page_number')[:10]
                chunk_text = "\n".join([c.content for c in chunks])
                content_parts.append(f"Document: {doc.title}\nTopic: {doc.topic}\nConcepts: {concepts}\nSummary: {summary[:500]}\nContent Excerpt:\n{chunk_text[:2000]}")
            content = '\n\n'.join(content_parts)
            
            prompt = (
                "Extract knowledge structure from this educational document. "
                "Instead of a basic hierarchical mindmap, create a semantic relationship graph using Mermaid JS `graph TD`. "
                "Include the main topic as the root node, connect it to major concepts, and break those into sub-concepts. "
                "Use meaningful relationship labels on edges (e.g., A -->|includes| B). "
                f"{mermaid_rules}"
            )
            
        elif source == 'topics':
            # Get topics with their associated memories for context
            topic_records = list(TopicMastery.objects.order_by('mastery_score')[:limit])
            if not topic_records:
                return Response({'error': 'No topics available. Chat with ManageAI to build your knowledge base.'}, status=400)
            
            content_parts = []
            for tm in topic_records:
                # Get a few memories for each topic to provide context
                memories = Memory.objects.filter(topic=tm.topic).order_by('-created_at')[:5]
                mem_texts = [f"Q: {m.question}\nA: {m.answer}" for m in memories]
                
                status_label = "✗ Missing/Weak" if tm.mastery_score < 40 else "⚠ Partial" if tm.mastery_score < 80 else "✓ Mastered"
                
                content_parts.append(
                    f"Topic: {tm.topic} (Mastery: {tm.mastery_score:.0f}%, Status: {status_label})\n"
                    f"Examples:\n" + "\n".join(mem_texts)
                )
            content = '\n\n'.join(content_parts)
            
            prompt = (
                "Visualize topic mastery levels and relationships. "
                "Analyze these topics and their example content. "
                "Create a Mermaid JS `graph TD` showing how these topics and their core concepts interrelate. "
                "Add styling to nodes based on their Mastery Status (Mastered=Green, Partial=Yellow, Missing/Weak=Red). "
                "Use relationship labels on edges (e.g., requires, builds on). "
                f"{mermaid_rules}"
            )
            
        else:  # memories
            memories = list(Memory.objects.order_by('-created_at')[:limit])
            if not memories:
                return Response({'error': 'No memories available. Start chatting to build your knowledge base.'}, status=400)
            
            # Group memories by topic for better structure
            topic_groups = {}
            for m in memories:
                topic = m.topic or 'General'
                if topic not in topic_groups:
                    topic_groups[topic] = []
                topic_groups[topic].append(m)
            
            content_parts = []
            for topic, mems in topic_groups.items():
                mem_texts = [f"Q: {m.question}\nA: {m.answer}" for m in mems]
                content_parts.append(
                    f"Domain: {topic}\n"
                    f"Knowledge Base:\n" + '\n'.join(mem_texts)
                )
            content = '\n\n'.join(content_parts)
            
            prompt = (
                "You are an AI Knowledge Graph Architect. Transform these Q&A memories into a semantic educational Knowledge Graph. "
                "1. Identify the core concepts discussed in the Q&A. "
                "2. Create a Mermaid JS `graph TD` showing the hierarchy and relationships between concepts. "
                "3. Use meaningful edge labels. "
                "4. Make the root node the main overarching subject. "
                f"{mermaid_rules}"
            )

        if not content.strip():
            return Response({'error': 'No content available to generate concept map.'}, status=400)

        response = groq_client.chat.completions.create(
            model=MODELS[DEFAULT_MODEL]['id'],
            messages=[
                {'role': 'system', 'content': prompt},
                {'role': 'user', 'content': content[:12000]},
            ],
            max_tokens=1500,
            temperature=0.2,
        )
        
        mermaid_code = response.choices[0].message.content.strip().replace('```mermaid', '').replace('```', '').strip()
        
        # Fix common LLM mermaid syntax hallucinations
        mermaid_code = mermaid_code.replace('|>', '| ')
        mermaid_code = mermaid_code.replace('-->>', '-->')
        
        # Fallback to simple graph if LLM returned mindmap by mistake or failed
        if mermaid_code.startswith('mindmap') or not mermaid_code.startswith('graph'):
            if source == 'memories' and 'topic_groups' in locals():
                topics_str = '\n  '.join([f"Root --> node{i}[\"{t}\"]" for i, t in enumerate(topic_groups.keys())])
                mermaid_code = f"graph TD\n  Root[\"Knowledge Base\"]\n  {topics_str}"
            else:
                mermaid_code = "graph TD\n  Root[\"Start Learning\"] --> Data[\"Add Data\"]"

        return Response({'diagram': mermaid_code})


class AdaptiveQuizGenerateView(APIView):
    def post(self, request):
        difficulty = request.data.get('difficulty', 'intermediate')
        if difficulty not in ['beginner', 'intermediate', 'advanced', 'expert']:
            return Response({'error': 'Invalid difficulty'}, status=400)

        topics = get_priority_topics(limit=5)
        if not topics:
            topics = list(Memory.objects.values_list('topic', flat=True).distinct()[:5])

        memories = Memory.objects.filter(topic__in=topics).order_by('-created_at')[:20]
        if not memories:
            return Response({'error': 'No memories available for adaptive quiz'}, status=400)

        context = '\n\n'.join([f"Topic: {m.topic}\nQ: {m.question}\nA: {m.answer}" for m in memories])
        model_key = request.data.get('model', DEFAULT_MODEL)
        model = MODELS.get(model_key, MODELS[DEFAULT_MODEL])['id']
        questions = generate_quiz_for_level(context, difficulty, groq_client, model)

        return Response({
            'difficulty': difficulty,
            'prioritized_topics': topics,
            'questions': questions,
        })


class BulkFlashcardsView(APIView):
    def post(self, request):
        try:
            subject = (request.data.get("subject") or "").strip()

            if getattr(settings, 'ENABLE_ASYNC_TASKS', False):
                generate_flashcards_task.delay(subject)
                return Response({'queued': True, 'message': 'Flashcard generation queued'})

            if subject:
                # Only regenerate cards for the requested subject.
                # Match by topic (exact, case-insensitive) or by question/answer text.
                memories = Memory.objects.filter(
                    Q(topic__iexact=subject)
                    | Q(question__icontains=subject)
                    | Q(answer__icontains=subject)
                )[:12]

                # Remove existing cards belonging to the matched memories so we
                # regenerate them without wiping cards for other subjects.
                Flashcard.objects.filter(memory__in=memories).delete()
            else:
                # No filter → full regenerate from the most recent memories.
                Flashcard.objects.all().delete()
                memories = Memory.objects.all()[:12]

            for memory in memories:
                fc_data = generate_flashcard(memory.question, memory.answer)
                Flashcard.objects.create(
                    memory=memory,
                    front=fc_data["front"],
                    back=fc_data["back"],
                )

            # Return the full, up-to-date set so the frontend can refresh in place.
            return Response(
                FlashcardSerializer(Flashcard.objects.all(), many=True).data
            )

        except Exception as e:
            traceback.print_exc()
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
class TopicsView(APIView):
    def get(self, request):
        topics = Memory.objects.values('topic').annotate(
            count=Count('id')
        ).order_by('-count')
        return Response(list(topics))


class ChatSessionListView(APIView):
    def get(self, request):
        return Response(
            ChatSessionSerializer(ChatSession.objects.all(), many=True).data
        )

    def post(self, request):
        session = ChatSession.objects.create(
            title=request.data.get('title', 'New Chat')
        )
        return Response(ChatSessionSerializer(session).data, status=201)


class ChatSessionDetailView(APIView):
    def _get(self, session_id):
        try:
            return ChatSession.objects.get(id=session_id)
        except ChatSession.DoesNotExist:
            return None

    def get(self, request, session_id):
        s = self._get(session_id)
        return Response(
            ChatSessionSerializer(s).data
        ) if s else Response({'error': 'Not found'}, status=404)

    def patch(self, request, session_id):
        s = self._get(session_id)
        if not s:
            return Response({'error': 'Not found'}, status=404)
        if 'title' in request.data:
            s.title = request.data['title']
        if 'topic' in request.data:
            s.topic = request.data['topic']
        s.save()
        return Response(ChatSessionSerializer(s).data)

    def delete(self, request, session_id):
        s = self._get(session_id)
        if not s:
            return Response({'error': 'Not found'}, status=404)
        s.delete()
        return Response({'success': True})


class ChatSessionMessagesView(APIView):
    def get(self, request, session_id):
        msgs = ChatMessage.objects.filter(session_id=session_id)
        return Response(ChatMessageSerializer(msgs, many=True).data)
    

# ── Helper: Auto-generate all quiz levels ────────────────────────────────────
def _generate_all_quizzes_for_pdf(doc, model_key=DEFAULT_MODEL, delay_seconds=3):
    """
    Automatically generate quizzes for all 4 difficulty levels.
    Adds delays between API calls to avoid rate limits.
    Returns dict with success/failure status per level.
    """
    model = MODELS.get(model_key, MODELS[DEFAULT_MODEL])["id"]
    results = {}
    
    # Build context from PDF chunks
    chunks = PDFChunk.objects.filter(document=doc).order_by("page_number")
    full_text = "\n\n".join(c.content for c in chunks[:20])
    
    if not full_text.strip():
        return {"error": "No text content available for quiz generation"}
    
    # Priority topics for adaptive learning
    priority_topics = get_priority_topics(limit=4)
    if priority_topics:
        related_memories = Memory.objects.filter(
            topic__in=priority_topics
        ).order_by("-created_at")[:8]
        if related_memories:
            reinforcement = "\n\n".join(
                [f"Topic: {m.topic}\nQ: {m.question}\nA: {m.answer}" for m in related_memories]
            )
            full_text = f"{full_text}\n\nPrioritize these weak areas:\n{reinforcement}"
    
    groq = _groq()
    
    # Generate quiz for each difficulty level with rate limit handling
    for difficulty in LEVELS:
        try:
            # Check if quiz already exists for this level
            existing_count = PDFQuiz.objects.filter(
                document=doc, 
                difficulty=difficulty
            ).count()
            
            if existing_count >= 5:
                results[difficulty] = {"status": "already_exists", "count": existing_count}
                continue
            
            # Delete any partial quiz data
            PDFQuiz.objects.filter(document=doc, difficulty=difficulty).delete()
            
            # Generate questions
            questions = generate_quiz_for_level(full_text, difficulty, groq, model)
            
            if not questions:
                results[difficulty] = {"status": "failed", "error": "No questions generated"}
                time.sleep(delay_seconds)  # Still add delay before next attempt
                continue
            
            # Save questions
            saved_count = 0
            for q in questions:
                PDFQuiz.objects.create(
                    document=doc,
                    difficulty=difficulty,
                    question=q["question"],
                    options=q["options"],
                    answer=q["answer"],
                    explanation=q.get("explanation", ""),
                )
                saved_count += 1
            
            results[difficulty] = {"status": "success", "count": saved_count}
            
            # Add delay between API calls to avoid rate limits
            # (except after the last level)
            if difficulty != LEVELS[-1]:
                time.sleep(delay_seconds)
                
        except Exception as exc:
            results[difficulty] = {"status": "error", "error": str(exc)}
            # Continue with next level even if one fails
            if difficulty != LEVELS[-1]:
                time.sleep(delay_seconds)
    
    return results


# ── 1. Upload PDF ─────────────────────────────────────────────────────────────
@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def upload_pdf(request):
    """
    POST /api/pdf/upload/
    Form data: file (PDF), user_prompt (optional), model (optional)
    Steps: extract → chunk → embed → store → summarise
    """
    pdf_file = request.FILES.get("file")
    if not pdf_file:
        return Response({"error": "No file provided"}, status=400)
 
    user_prompt = request.data.get("user_prompt", "").strip()
    model_key = request.data.get("model", DEFAULT_MODEL)
    model = MODELS.get(model_key, MODELS[DEFAULT_MODEL])["id"]
 
    pdf_bytes = pdf_file.read()
 
    # 1. Extract text
    pages = extract_text_by_page(pdf_bytes)
    if not pages:
        return Response({"error": "Could not extract text from PDF"}, status=400)
 
    full_text = "\n\n".join(p["text"] for p in pages)
    chunks = chunk_pages(pages)
 
    # 2. Detect topic (reuse logic from your existing utils if you like)
    topic = _detect_topic(full_text)
 
    # 3. Create document record
    doc = PDFDocument.objects.create(
        title=pdf_file.name.replace(".pdf", "").replace("_", " ").title(),
        filename=pdf_file.name,
        user_prompt=user_prompt,
        page_count=len(pages),
        topic=topic,
    )

    if getattr(settings, 'ENABLE_ASYNC_TASKS', False):
        process_pdf_upload_task.delay(doc.id, pdf_bytes, user_prompt, model_key)
        return Response(
            {
                'id': doc.id,
                'title': doc.title,
                'topic': doc.topic,
                'page_count': doc.page_count,
                'chunk_count': 0,
                'summary': '',
                'queued': True,
            },
            status=202,
        )
 
    # 4. Embed and store chunks
    for chunk in chunks:
        embedding = embed_text(chunk["content"])
        PDFChunk.objects.create(
            document=doc,
            content=chunk["content"],
            page_number=chunk["page"],
            embedding=embedding,
        )
 
    # 5. Generate summary
    summary = generate_summary(full_text, user_prompt, groq_client, model)
    learning_structure = extract_learning_structure(full_text)
    doc.summary = summary
    doc.concepts = learning_structure['concepts']
    doc.definitions = learning_structure['definitions']
    doc.relationships = learning_structure['relationships']
    doc.save()
 
    # 6. Auto-generate quizzes for all difficulty levels
    quiz_results = {}
    try:
        quiz_results = _generate_all_quizzes_for_pdf(doc, model_key, delay_seconds=3)
    except Exception as quiz_error:
        # Don't fail the upload if quiz generation fails
        quiz_results = {"error": str(quiz_error)}
 
    return Response(
        {
            "id": doc.id,
            "title": doc.title,
            "topic": doc.topic,
            "page_count": doc.page_count,
            "chunk_count": len(chunks),
            "summary": summary,
            "quiz_generation": quiz_results,
        },
        status=201,
    )
 
 
# ── 2. List PDFs ──────────────────────────────────────────────────────────────
@api_view(["GET"])
def list_pdfs(request):
    """GET /api/pdf/"""
    docs = PDFDocument.objects.all().order_by("-uploaded_at").values(
        "id", "title", "filename", "topic", "page_count", "mastered", "uploaded_at", "summary"
    )
    return Response(list(docs))
 
 
# ── 3. Get single PDF detail ──────────────────────────────────────────────────
@api_view(["GET", "DELETE"])
def pdf_detail(request, doc_id):
    """GET /api/pdf/<id>/   DELETE /api/pdf/<id>/"""
    try:
        doc = PDFDocument.objects.get(id=doc_id)
    except PDFDocument.DoesNotExist:
        return Response({"error": "Not found"}, status=404)
 
    if request.method == "DELETE":
        doc.delete()
        return Response(status=204)
 
    return Response(
        {
            "id": doc.id,
            "title": doc.title,
            "filename": doc.filename,
            "user_prompt": doc.user_prompt,
            "summary": doc.summary,
            "topic": doc.topic,
            "concepts": doc.concepts,
            "definitions": doc.definitions,
            "relationships": doc.relationships,
            "page_count": doc.page_count,
            "mastered": doc.mastered,
            "uploaded_at": doc.uploaded_at,
            "quiz_counts": {
                d: PDFQuiz.objects.filter(document=doc, difficulty=d).count()
                for d in ["beginner", "intermediate", "advanced", "expert"]
            },
        }
    )
 
 
# ── 4. Chat with a PDF (RAG) ──────────────────────────────────────────────────
@api_view(["POST"])
def chat_with_pdf(request, doc_id):
    """
    POST /api/pdf/<id>/chat/
    Body: {message, model (optional)}
    Returns relevant chunks + AI answer.
    """
    try:
        doc = PDFDocument.objects.get(id=doc_id)
    except PDFDocument.DoesNotExist:
        return Response({"error": "Not found"}, status=404)
 
    message = request.data.get("message", "").strip()
    model_key = request.data.get("model", DEFAULT_MODEL)
    model = MODELS.get(model_key, MODELS[DEFAULT_MODEL])["id"]
    if not message:
        return Response({"error": "message required"}, status=400)
 
    # Embed query and find nearest chunks
    query_vec = embed_text(message)
    relevant = (
        PDFChunk.objects.filter(document=doc)
        .annotate(distance=CosineDistance("embedding", query_vec))
        .filter(distance__lt=0.5)
        .order_by("distance")[:6]
    )
 
    context = "\n\n".join(c.content for c in relevant)
    user_prompt_note = f"\n\nNote from the user when this PDF was uploaded: {doc.user_prompt}" if doc.user_prompt else ""
 
    system = (
        f"You are a helpful assistant answering questions about a PDF titled '{doc.title}'. "
        f"Use ONLY the provided context to answer. If the answer isn't in the context, say so."
        f"{user_prompt_note}"
    )
 
    groq = _groq()
    response = groq.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {message}"},
        ],
        max_tokens=800,
    )
    answer = response.choices[0].message.content
 
    return Response(
        {
            "answer": answer,
            "sources": [
                {"page": c.page_number, "snippet": c.content[:200]}
                for c in relevant
            ],
        }
    )
 
 
#  #── 5. Generate quiz for a difficulty level ───────────────────────────────────
# @api_view(["POST"])
# def generate_quiz(request, doc_id):
#     """
#     POST /api/pdf/<id>/quiz/generate/
#     Body: {difficulty: "beginner"|"intermediate"|"advanced"|"expert", model (optional)}
#     Generates and stores 5 questions, returns them.
#     """
#     try:
#         doc = PDFDocument.objects.get(id=doc_id)
#     except PDFDocument.DoesNotExist:
#         return Response({"error": "Not found"}, status=404)
 
#     difficulty = request.data.get("difficulty", "beginner")
#     if difficulty not in ["beginner", "intermediate", "advanced", "expert"]:
#         return Response({"error": "Invalid difficulty"}, status=400)
 
#     model_key = request.data.get("model", DEFAULT_MODEL)
#     model = MODELS.get(model_key, MODELS[DEFAULT_MODEL])["id"]
 
#     # Delete old questions at this level so we can regenerate
#     PDFQuiz.objects.filter(document=doc, difficulty=difficulty).delete()
 
#     # Adaptive difficulty: if this topic is weak, step down one level for higher completion.
#     mastery = TopicMastery.objects.filter(topic=doc.topic).first()
#     levels = ["beginner", "intermediate", "advanced", "expert"]
#     if mastery and mastery.mastery_score < 45:
#         idx = max(0, levels.index(difficulty) - 1)
#         difficulty = levels[idx]

#     # Prioritize weaker and overdue topics in context while keeping this PDF core.
#     chunks = PDFChunk.objects.filter(document=doc).order_by("page_number")
#     full_text = "\n\n".join(c.content for c in chunks[:20])
#     priority_topics = get_priority_topics(limit=4)
#     if priority_topics:
#         related_memories = Memory.objects.filter(topic__in=priority_topics).order_by('-created_at')[:8]
#         if related_memories:
#             reinforcement = "\n\n".join([f"Topic: {m.topic}\nQ: {m.question}\nA: {m.answer}" for m in related_memories])
#             full_text = f"{full_text}\n\nPrioritize these weak areas:\n{reinforcement}"
 
#     groq = _groq()
#     questions = generate_quiz_for_level(full_text, difficulty, groq, model)
 
#     saved = []
#     for q in questions:
#         obj = PDFQuiz.objects.create(
#             document=doc,
#             difficulty=difficulty,
#             question=q["question"],
#             options=q["options"],
#             answer=q["answer"],
#             explanation=q.get("explanation", ""),
#         )
#         saved.append(
#             {
#                 "id": obj.id,
#                 "question": obj.question,
#                 "options": obj.options,
#                 "answer": obj.answer,
#                 "explanation": obj.explanation,
#             }
#         )
 
#     return Response({"difficulty": difficulty, "questions": saved})
 
 
# # ── 6. Get quiz questions (no answers) ───────────────────────────────────────
# @api_view(["GET"])
# def get_quiz(request, doc_id):
#     """
#     GET /api/pdf/<id>/quiz/?difficulty=beginner
#     Returns questions WITHOUT answers (for taking the quiz).
#     """
#     difficulty = request.query_params.get("difficulty", "beginner")
#     questions = PDFQuiz.objects.filter(document_id=doc_id, difficulty=difficulty)
#     data = [
#         {"id": q.id, "question": q.question, "options": q.options}
#         for q in questions
#     ]
#     return Response({"difficulty": difficulty, "questions": data})
 
 
# # ── 7. Submit quiz answers ────────────────────────────────────────────────────
# @api_view(["POST"])
# def submit_quiz(request, doc_id):
#     """
#     POST /api/pdf/<id>/quiz/submit/
#     Body: {difficulty, answers: {<question_id>: "A"|"B"|"C"|"D", ...}}
#     Returns: score, per-question feedback, pass/fail, mastery update.
#     PASS threshold = 80% correct. All 4 levels passed → mastered = True.
#     """
#     try:
#         doc = PDFDocument.objects.get(id=doc_id)
#     except PDFDocument.DoesNotExist:
#         return Response({"error": "Not found"}, status=404)
 
#     difficulty = request.data.get("difficulty")
#     answers = request.data.get("answers", {})  # {str(id): letter}
 
#     questions = PDFQuiz.objects.filter(document=doc, difficulty=difficulty)
#     if not questions.exists():
#         return Response({"error": "No quiz found for this level. Generate one first."}, status=400)
 
#     correct = 0
#     total = questions.count()
#     results = []
 
#     for q in questions:
#         user_ans = answers.get(str(q.id), "")
#         is_correct = user_ans.upper() == q.answer
#         if is_correct:
#             correct += 1
#         update_topic_mastery(doc.topic, is_correct)
#         results.append(
#             {
#                 "id": q.id,
#                 "question": q.question,
#                 "user_answer": user_ans,
#                 "correct_answer": q.answer,
#                 "is_correct": is_correct,
#                 "explanation": q.explanation,
#             }
#         )
 
#     score_pct = round(correct / total * 100) if total else 0
#     passed = score_pct >= 80

#     QuizAttempt.objects.create(
#         source='pdf',
#         topic=doc.topic,
#         score=score_pct,
#         correct=correct,
#         total=total,
#     )
 
#     # Check mastery: all 4 levels must have been passed at 80%+
#     # We track this via a simple heuristic: if this was the last unpassed level
#     # and this attempt passes, mark mastered.
#     mastery_unlocked = False
#     if passed and not doc.mastered:
#         # Check whether other levels have at least 5 questions (proxy for "done")
#         levels = ["beginner", "intermediate", "advanced", "expert"]
#         all_done = all(
#             PDFQuiz.objects.filter(document=doc, difficulty=lvl).count() >= 5
#             for lvl in levels
#         )
#         if all_done:
#             # For full mastery, require user has attempted and passed each level.
#             # Here we trust the front-end to enforce sequence; we just check counts.
#             doc.mastered = True
#             doc.save()
#             mastery_unlocked = True
 
#     return Response(
#         {
#             "score": score_pct,
#             "correct": correct,
#             "total": total,
#             "passed": passed,
#             "mastery_unlocked": mastery_unlocked,
#             "results": results,
#         }
#     )
 
@api_view(["POST"])
def generate_quiz(request, doc_id):
    """
    POST /api/pdf/<id>/quiz/generate/
    Body: {difficulty: "beginner"|"intermediate"|"advanced"|"expert", model (optional)}
    Generates and stores 5 questions, returns them.
 
    If the topic mastery score is below 45, the difficulty is automatically
    stepped down one level. The response always includes both the originally
    requested difficulty AND the effective difficulty so the client can react.
    """
    try:
        doc = PDFDocument.objects.get(id=doc_id)
    except PDFDocument.DoesNotExist:
        return Response({"error": "Not found"}, status=404)
 
    requested_difficulty = request.data.get("difficulty", "beginner")
    if requested_difficulty not in LEVELS:
        return Response(
            {"error": f"Invalid difficulty. Must be one of: {', '.join(LEVELS)}"},
            status=400,
        )
 
    model_key = request.data.get("model", DEFAULT_MODEL)
    model = MODELS.get(model_key, MODELS[DEFAULT_MODEL])["id"]
 
    # ── Adaptive difficulty step-down ────────────────────────────────────────
    # Determine the effective difficulty BEFORE deleting old questions so we
    # only ever wipe the level we are about to write.
    effective_difficulty = requested_difficulty
    mastery = TopicMastery.objects.filter(topic=doc.topic).first()
    if mastery and mastery.mastery_score < 45:
        idx = max(0, LEVELS.index(requested_difficulty) - 1)
        effective_difficulty = LEVELS[idx]
 
    # Delete old questions at the *effective* level only.
    # (Bug fix #1: previously deleted at requested level, leaving the stepped-down
    # level un-cleared and accumulating duplicate questions on every regeneration.)
    PDFQuiz.objects.filter(document=doc, difficulty=effective_difficulty).delete()
 
    # ── Build context ────────────────────────────────────────────────────────
    chunks = PDFChunk.objects.filter(document=doc).order_by("page_number")
    full_text = "\n\n".join(c.content for c in chunks[:20])
 
    priority_topics = get_priority_topics(limit=4)
    if priority_topics:
        related_memories = Memory.objects.filter(
            topic__in=priority_topics
        ).order_by("-created_at")[:8]
        if related_memories:
            reinforcement = "\n\n".join(
                [f"Topic: {m.topic}\nQ: {m.question}\nA: {m.answer}" for m in related_memories]
            )
            full_text = f"{full_text}\n\nPrioritize these weak areas:\n{reinforcement}"
 
    # ── Call LLM (Bug fix #6: wrapped in try/except) ─────────────────────────
    try:
        print("+")
        groq = _groq()
        print("-"*20)
        questions = generate_quiz_for_level(full_text, effective_difficulty, groq, model)
        print("*"*20)
    except Exception as exc:
        return Response(
            {"error": f"Quiz generation failed: {str(exc)}"},
            status=400,
        )
 
    # ── Persist questions ────────────────────────────────────────────────────
    saved = []
    for q in questions:
        obj = PDFQuiz.objects.create(
            document=doc,
            difficulty=effective_difficulty,
            question=q["question"],
            options=q["options"],
            answer=q["answer"],
            explanation=q.get("explanation", ""),
        )
        saved.append(
            {
                "id": obj.id,
                "question": obj.question,
                "options": obj.options,
                "answer": obj.answer,
                "explanation": obj.explanation,
            }
        )
 
    # Bug fix #5: always surface both difficulties so the client knows a
    # step-down occurred and can update its UI accordingly.
    return Response(
        {
            "requested_difficulty": requested_difficulty,
            "effective_difficulty": effective_difficulty,
            "difficulty_adjusted": effective_difficulty != requested_difficulty,
            "questions": saved,
        }
    )
 
 
# ── 6. Get quiz questions (no answers) ───────────────────────────────────────
@api_view(["GET"])
def get_quiz(request, doc_id):
    """
    GET /api/pdf/<id>/quiz/?difficulty=beginner
    Returns questions WITHOUT answers (for taking the quiz).
    """
    # Bug fix #2: added 404 guard that was missing entirely in the original.
    try:
        PDFDocument.objects.get(id=doc_id)
    except PDFDocument.DoesNotExist:
        return Response({"error": "Not found"}, status=404)
 
    difficulty = request.query_params.get("difficulty", "beginner")
    if difficulty not in LEVELS:
        return Response(
            {"error": f"Invalid difficulty. Must be one of: {', '.join(LEVELS)}"},
            status=400,
        )
 
    questions = PDFQuiz.objects.filter(document_id=doc_id, difficulty=difficulty)
    data = [
        {"id": q.id, "question": q.question, "options": q.options}
        for q in questions
    ]
    return Response({"difficulty": difficulty, "questions": data})
 
 
# ── 7. Submit quiz answers ────────────────────────────────────────────────────
@api_view(["POST"])
def submit_quiz(request, doc_id):
    """
    POST /api/pdf/<id>/quiz/submit/
    Body: {difficulty, answers: {<question_id>: "A"|"B"|"C"|"D", ...}}
    Returns: score, per-question feedback, pass/fail, mastery update.
    PASS threshold = 80% correct. All 4 levels passed → mastered = True.
    """
    try:
        doc = PDFDocument.objects.get(id=doc_id)
    except PDFDocument.DoesNotExist:
        return Response({"error": "Not found"}, status=404)
 
    # Bug fix #3: explicit presence check + validation for difficulty.
    # Previously, omitting difficulty silently set it to None, which hit a
    # misleading "No quiz found" 400 instead of a clear validation error.
    difficulty = request.data.get("difficulty")
    if not difficulty:
        return Response({"error": "difficulty is required."}, status=400)
    if difficulty not in LEVELS:
        return Response(
            {"error": f"Invalid difficulty. Must be one of: {', '.join(LEVELS)}"},
            status=400,
        )
 
    answers = request.data.get("answers", {})  # {str(id): letter}
 
    questions = PDFQuiz.objects.filter(document=doc, difficulty=difficulty)
    if not questions.exists():
        return Response(
            {"error": "No quiz found for this level. Generate one first."},
            status=400,
        )
 
    correct = 0
    total = questions.count()
    results = []
 
    for q in questions:
        user_ans = answers.get(str(q.id), "")
        is_correct = user_ans.upper() == q.answer
        if is_correct:
            correct += 1
        update_topic_mastery(doc.topic, is_correct)
        results.append(
            {
                "id": q.id,
                "question": q.question,
                "user_answer": user_ans,
                "correct_answer": q.answer,
                "is_correct": is_correct,
                "explanation": q.explanation,
            }
        )
 
    score_pct = round(correct / total * 100) if total else 0
    passed = score_pct >= PASS_THRESHOLD
 
    QuizAttempt.objects.create(
        source="pdf",
        topic=doc.topic,
        difficulty=difficulty,
        score=score_pct,
        correct=correct,
        total=total,
        passed=passed,
    )
 
    # ── Mastery unlock ───────────────────────────────────────────────────────
    mastery_unlocked = False
    if passed and not doc.mastered:
        # Bug fix #4 + #7: use select_for_update to prevent race conditions
        # on the mastered flag, and check QuizAttempt records to confirm the
        # user actually *passed* every level — not just that questions exist.
        with transaction.atomic():
            doc_locked = PDFDocument.objects.select_for_update().get(pk=doc.pk)
            if not doc_locked.mastered:
                all_levels_passed = all(
                    QuizAttempt.objects.filter(
                        topic=doc.topic,
                        difficulty=lvl,
                        passed=True,
                        source="pdf",
                    ).exists()
                    for lvl in LEVELS
                )
                if all_levels_passed:
                    doc_locked.mastered = True
                    doc_locked.save()
                    mastery_unlocked = True
 
    return Response(
        {
            "score": score_pct,
            "correct": correct,
            "total": total,
            "passed": passed,
            "mastery_unlocked": mastery_unlocked,
            "results": results,
        }
    )
 
 
# ── 8. Mark mastered manually ────────────────────────────────────────────────
@api_view(["POST"])
def mark_mastered(request, doc_id):
    """POST /api/pdf/<id>/master/"""
    try:
        doc = PDFDocument.objects.get(id=doc_id)
    except PDFDocument.DoesNotExist:
        return Response({"error": "Not found"}, status=404)
    doc.mastered = True
    doc.save()
    return Response({"mastered": True})
 
 
# ── helpers ───────────────────────────────────────────────────────────────────
def _groq():
    """Return the shared Groq client."""
    return groq_client


def _detect_topic(text: str) -> str:
    text_lower = text.lower()
    if any(w in text_lower for w in ["algorithm", "sorting", "graph", "dynamic programming", "complexity", "big o"]):
        return "Algorithms"
    if any(w in text_lower for w in ["python", "javascript", "function", "class", "import", "framework", "api"]):
        return "Programming"
    if any(w in text_lower for w in ["calculus", "linear algebra", "statistics", "theorem", "proof", "matrix"]):
        return "Math"
    if any(w in text_lower for w in ["quantum", "mechanics", "thermodynamics", "energy", "physics", "velocity"]):
        return "Physics"
    if any(w in text_lower for w in ["sql", "join", "index", "database", "query", "migration", "schema"]):
        return "Database"
    if any(w in text_lower for w in ["country", "city", "continent", "geography", "population", "capital"]):
        return "Geography"
    return "General"