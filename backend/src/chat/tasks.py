from celery import shared_task
import time

from .models import PDFDocument, PDFChunk, Flashcard, Memory, PDFQuiz
from .utils import (
    DEFAULT_MODEL,
    MODELS,
    chunk_pages,
    embed_text,
    extract_text_by_page,
    generate_flashcard,
    extract_learning_structure,
    generate_summary,
    generate_quiz_for_level,
    groq_client,
)


@shared_task
def process_pdf_upload_task(doc_id: int, pdf_bytes: bytes, user_prompt: str, model_key: str = DEFAULT_MODEL):
    try:
        doc = PDFDocument.objects.get(id=doc_id)
    except PDFDocument.DoesNotExist:
        return {'error': 'document_not_found'}

    pages = extract_text_by_page(pdf_bytes)
    chunks = chunk_pages(pages)
    full_text = '\n\n'.join(p['text'] for p in pages)

    for chunk in chunks:
        embedding = embed_text(chunk['content'])
        PDFChunk.objects.create(
            document=doc,
            content=chunk['content'],
            page_number=chunk['page'],
            embedding=embedding,
        )

    model = MODELS.get(model_key, MODELS[DEFAULT_MODEL])['id']
    structure = extract_learning_structure(full_text)
    doc.summary = generate_summary(full_text, user_prompt, groq_client, model)
    doc.concepts = structure['concepts']
    doc.definitions = structure['definitions']
    doc.relationships = structure['relationships']
    doc.save(update_fields=['summary', 'concepts', 'definitions', 'relationships'])
    
    # Generate quizzes for all difficulty levels
    levels = ["beginner", "intermediate", "advanced", "expert"]
    quiz_results = {}
    for difficulty in levels:
        try:
            # Build context from chunks
            context = full_text[:10000]  # Limit context size
            
            # Generate questions
            questions = generate_quiz_for_level(context, difficulty, groq_client, model)
            
            if questions:
                # Delete old quiz for this level
                PDFQuiz.objects.filter(document=doc, difficulty=difficulty).delete()
                
                # Save new questions
                for q in questions:
                    PDFQuiz.objects.create(
                        document=doc,
                        difficulty=difficulty,
                        question=q["question"],
                        options=q["options"],
                        answer=q["answer"],
                        explanation=q.get("explanation", ""),
                    )
                quiz_results[difficulty] = "success"
            else:
                quiz_results[difficulty] = "failed"
            
            # Add delay between API calls to avoid rate limits
            if difficulty != levels[-1]:
                time.sleep(3)
                
        except Exception as exc:
            quiz_results[difficulty] = f"error: {str(exc)}"
            # Continue with next level
            if difficulty != levels[-1]:
                time.sleep(3)
    
    return {'status': 'ok', 'chunk_count': len(chunks), 'quiz_results': quiz_results}


@shared_task
def generate_flashcards_task(subject: str = ''):
    subject = (subject or '').strip()

    if subject:
        memories = Memory.objects.filter(
            topic__iexact=subject,
        )[:12]
        if not memories.exists():
            memories = Memory.objects.filter(question__icontains=subject)[:12]
        Flashcard.objects.filter(memory__in=memories).delete()
    else:
        Flashcard.objects.all().delete()
        memories = Memory.objects.all()[:12]

    created = 0
    for memory in memories:
        fc_data = generate_flashcard(memory.question, memory.answer)
        Flashcard.objects.create(memory=memory, front=fc_data['front'], back=fc_data['back'])
        created += 1

    return {'status': 'ok', 'created': created}
