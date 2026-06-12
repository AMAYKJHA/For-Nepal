from pathlib import Path

from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from .models import Topic
from .serializers import TopicSerializer
from chat.utils import extract_text_by_page
from .utils import generate_quiz


def _resolve_upload_user(request):
    if getattr(request, "user", None) and request.user.is_authenticated:
        return request.user, None

    raw_user_id = (
        request.data.get("user_id")
        or request.query_params.get("user_id")
        or request.headers.get("X-User-Id")
    )
    if not raw_user_id:
        return None, Response(
            {
                "detail": "user_id is required. Provide it in form-data, query params, or X-User-Id header.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user_id = int(raw_user_id)
    except (TypeError, ValueError):
        return None, Response(
            {"detail": "user_id must be an integer."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        return User.objects.get(id=user_id), None
    except User.DoesNotExist:
        return None, Response(
            {"detail": "User not found."},
            status=status.HTTP_404_NOT_FOUND,
        )


@api_view(["GET"])
def user_topics(request, user_id):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)
    topics = Topic.objects.filter(user=user)
    return Response(TopicSerializer(topics, many=True).data)


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def topic_upload(request):
    user, error_response = _resolve_upload_user(request)
    if error_response is not None:
        return error_response

    pdf_file = request.FILES.get("file")
    if not pdf_file:
        return Response({"detail": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

    title = (request.data.get("title") or Path(pdf_file.name).stem or "Untitled Topic")[:255]

    topic = Topic.objects.create(
        user=user,
        title=title,
        source_filename=pdf_file.name,
        status=Topic.Status.PROCESSING,
    )

    pages = extract_text_by_page(pdf_file.read())
    if not pages:
        topic.status = Topic.Status.FAILED
        topic.quiz_data = {"error": "Could not extract text from PDF."}
        topic.save(update_fields=["status", "quiz_data"])
        return Response(
            {
                "detail": "Could not extract text from PDF.",
                "topic": TopicSerializer(topic).data,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    full_text = "\n\n".join(p["text"] for p in pages)
    try:
        quiz = generate_quiz(full_text)
    except Exception as exc:
        topic.status = Topic.Status.FAILED
        topic.quiz_data = {"error": str(exc)}
        topic.save(update_fields=["status", "quiz_data"])
        return Response(
            {
                "detail": "Failed to generate quiz.",
                "topic": TopicSerializer(topic).data,
            },
            status=status.HTTP_502_BAD_GATEWAY,
        )

    if not isinstance(quiz, dict):
        topic.status = Topic.Status.FAILED
        topic.quiz_data = {"error": "Quiz generator returned an invalid payload."}
        topic.save(update_fields=["status", "quiz_data"])
        return Response(
            {
                "detail": "Failed to generate quiz.",
                "topic": TopicSerializer(topic).data,
            },
            status=status.HTTP_502_BAD_GATEWAY,
        )

    generated_topic_name = quiz.get("topic")
    if generated_topic_name and not request.data.get("title"):
        topic.title = str(generated_topic_name)[:255]

    with transaction.atomic():
        topic.quiz_data = quiz
        topic.status = Topic.Status.READY
        topic.save(update_fields=["title", "quiz_data", "status"])

    return Response(
        {
            "topic": TopicSerializer(topic).data,
            "quiz": topic.quiz_data,
        },
        status=status.HTTP_201_CREATED,
    )
