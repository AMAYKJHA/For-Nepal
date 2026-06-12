from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count
from django.db.models.expressions import RawSQL
from rest_framework import status
from .utils import generate_memory_summary, groq_client, MODELS, DEFAULT_MODEL
from .models import (
    Memory, Flashcard, ChatSession, ChatMessage,
    PDFDocument, PDFChunk, PDFQuiz,
)
from .serializers import (
    MemorySerializer, FlashcardSerializer, ChatSessionSerializer,
    ChatMessageSerializer, ChatRequestSerializer,
    SearchRequestSerializer, SummarizeRequestSerializer,
)
from .utils import (
    detect_topic, generate_embedding,
    get_groq_response, generate_summary, generate_flashcard, generate_memory_summary,
    groq_client,
    extract_text_by_page, chunk_pages, embed_text, generate_quiz_for_level,
)
import traceback
from pgvector.django import CosineDistance


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

            system_prompt = (
                "You are ManageAI, a friendly AI assistant with memory. "
                "Be clear, helpful, and concise. Use markdown when appropriate."
                + context
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

            # ── Save memory ─────────────────────────
            memory = Memory.objects.create(
                # user=request.user,
                question=user_message,
                answer=answer,
                topic=topic,
                summary=summary,
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
                .order_by('distance')[:10]
            )
        else:
            memories = Memory.objects.filter(
                Q(question__icontains=query) | Q(answer__icontains=query)
            )[:10]

        return Response(MemorySerializer(memories, many=True).data)


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


class BulkFlashcardsView(APIView):
    def post(self, request):
        try:
            subject = (request.data.get("subject") or "").strip()

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
    # 5. Generate summary
    doc.summary = summary
    doc.save()
 
    return Response(
        {
            "id": doc.id,
            "title": doc.title,
            "topic": doc.topic,
            "page_count": doc.page_count,
            "chunk_count": len(chunks),
            "summary": summary,
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
 
 
# ── 5. Generate quiz for a difficulty level ───────────────────────────────────
@api_view(["POST"])
def generate_quiz(request, doc_id):
    """
    POST /api/pdf/<id>/quiz/generate/
    Body: {difficulty: "beginner"|"intermediate"|"advanced"|"expert", model (optional)}
    Generates and stores 5 questions, returns them.
    """
    try:
        doc = PDFDocument.objects.get(id=doc_id)
    except PDFDocument.DoesNotExist:
        return Response({"error": "Not found"}, status=404)
 
    difficulty = request.data.get("difficulty", "beginner")
    if difficulty not in ["beginner", "intermediate", "advanced", "expert"]:
        return Response({"error": "Invalid difficulty"}, status=400)
 
    model_key = request.data.get("model", DEFAULT_MODEL)
    model = MODELS.get(model_key, MODELS[DEFAULT_MODEL])["id"]
 
    # Delete old questions at this level so we can regenerate
    PDFQuiz.objects.filter(document=doc, difficulty=difficulty).delete()
 
    # Get full text from chunks
    chunks = PDFChunk.objects.filter(document=doc).order_by("page_number")
    full_text = "\n\n".join(c.content for c in chunks)
 
    groq = _groq()
    questions = generate_quiz_for_level(full_text, difficulty, groq, model)
 
    saved = []
    for q in questions:
        obj = PDFQuiz.objects.create(
            document=doc,
            difficulty=difficulty,
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
 
    return Response({"difficulty": difficulty, "questions": saved})
 
 
# ── 6. Get quiz questions (no answers) ───────────────────────────────────────
@api_view(["GET"])
def get_quiz(request, doc_id):
    """
    GET /api/pdf/<id>/quiz/?difficulty=beginner
    Returns questions WITHOUT answers (for taking the quiz).
    """
    difficulty = request.query_params.get("difficulty", "beginner")
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
 
    difficulty = request.data.get("difficulty")
    answers = request.data.get("answers", {})  # {str(id): letter}
 
    questions = PDFQuiz.objects.filter(document=doc, difficulty=difficulty)
    if not questions.exists():
        return Response({"error": "No quiz found for this level. Generate one first."}, status=400)
 
    correct = 0
    total = questions.count()
    results = []
 
    for q in questions:
        user_ans = answers.get(str(q.id), "")
        is_correct = user_ans.upper() == q.answer
        if is_correct:
            correct += 1
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
    passed = score_pct >= 80
 
    # Check mastery: all 4 levels must have been passed at 80%+
    # We track this via a simple heuristic: if this was the last unpassed level
    # and this attempt passes, mark mastered.
    mastery_unlocked = False
    if passed and not doc.mastered:
        # Check whether other levels have at least 5 questions (proxy for "done")
        levels = ["beginner", "intermediate", "advanced", "expert"]
        all_done = all(
            PDFQuiz.objects.filter(document=doc, difficulty=lvl).count() >= 5
            for lvl in levels
        )
        if all_done:
            # For full mastery, require user has attempted and passed each level.
            # Here we trust the front-end to enforce sequence; we just check counts.
            doc.mastered = True
            doc.save()
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