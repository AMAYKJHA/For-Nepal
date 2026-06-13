from pathlib import Path
from datetime import timedelta

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from .models import Topic, GameSession, QuestionAttempt
from .serializers import (
    TopicSerializer,
    GameSessionSerializer,
    GameSessionStateUpdateSerializer,
    QuestionAttemptSerializer,
    QuestionAttemptCreateSerializer,
)
from chat.utils import extract_text_by_page
from .utils import generate_quiz


def _resolve_request_user(request):
    if getattr(request, "user", None) and request.user.is_authenticated:
        return request.user, None

    raw_user_id = None

    request_data = getattr(request, "data", None)
    if hasattr(request_data, "get"):
        raw_user_id = request_data.get("user_id")

    if not raw_user_id:
        query_params = getattr(request, "query_params", None)
        if hasattr(query_params, "get"):
            raw_user_id = query_params.get("user_id")

    if not raw_user_id:
        headers = getattr(request, "headers", None)
        if hasattr(headers, "get"):
            raw_user_id = headers.get("X-User-Id")

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


def _resolve_upload_user(request):
    return _resolve_request_user(request)


@api_view(["GET"])
def user_topics(request, user_id):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)
    topics = Topic.objects.filter(user=user)
    return Response(TopicSerializer(topics, many=True).data)


@api_view(["GET"])
def topic_session(request, topic_id):
    user, error_response = _resolve_request_user(request)
    if error_response is not None:
        return error_response

    try:
        topic = Topic.objects.get(id=topic_id, user=user)
    except Topic.DoesNotExist:
        return Response({"detail": "Topic not found."}, status=status.HTTP_404_NOT_FOUND)

    session = GameSession.objects.filter(user=user, topic=topic).order_by("-started_at").first()
    created = False

    if session is None:
        session = GameSession.objects.create(user=user, topic=topic)
        created = True

    return Response(
        {
            "created": created,
            "session": GameSessionSerializer(session).data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["PATCH"])
def submit_game_state(request, session_id):
    user, error_response = _resolve_request_user(request)
    if error_response is not None:
        return error_response

    try:
        session = GameSession.objects.select_related("topic").get(id=session_id, user=user)
    except GameSession.DoesNotExist:
        return Response({"detail": "Game session not found."}, status=status.HTTP_404_NOT_FOUND)

    serializer = GameSessionStateUpdateSerializer(data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    update_data = serializer.validated_data

    for field, value in update_data.items():
        setattr(session, field, value)

    if "status" in update_data:
        if session.status in [GameSession.Status.COMPLETED, GameSession.Status.DEFEATED]:
            if session.completed_at is None:
                session.completed_at = timezone.now()
        elif session.status == GameSession.Status.ACTIVE:
            session.completed_at = None

    update_fields = list(update_data.keys())
    if "status" in update_data:
        update_fields.append("completed_at")

    session.save(update_fields=update_fields)

    return Response(
        {"session": GameSessionSerializer(session).data},
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
def save_question_attempt(request, session_id):
    user, error_response = _resolve_request_user(request)
    if error_response is not None:
        return error_response

    try:
        session = GameSession.objects.select_related("user").get(id=session_id, user=user)
    except GameSession.DoesNotExist:
        return Response({"detail": "Game session not found."}, status=status.HTTP_404_NOT_FOUND)

    serializer = QuestionAttemptCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    payload = serializer.validated_data

    already_answered = QuestionAttempt.objects.filter(
        session=session,
        question_id=payload["question_id"],
        difficulty=payload["difficulty"],
    ).exists()
    if already_answered:
        return Response(
            {"detail": "Question already answered."},
            status=status.HTTP_409_CONFLICT,
        )

    attempt = QuestionAttempt.objects.create(
        session=session,
        question_id=payload["question_id"],
        difficulty=payload["difficulty"],
        chosen_index=payload["chosen_index"],
        correct_index=payload["correct_index"],
        is_correct=payload["chosen_index"] == payload["correct_index"],
    )

    return Response(
        {
            "attempt": QuestionAttemptSerializer(attempt).data,
            "session_id": str(session.id),
        },
        status=status.HTTP_201_CREATED,
    )


def _compute_streak(days_with_attempts):
    if not days_with_attempts:
        return {"current_streak": 0, "longest_streak": 0}

    longest = 1
    current = 0
    run = 1

    for idx in range(1, len(days_with_attempts)):
        if days_with_attempts[idx] - days_with_attempts[idx - 1] == timedelta(days=1):
            run += 1
        else:
            longest = max(longest, run)
            run = 1
    longest = max(longest, run)

    today = timezone.localdate()
    last_day = days_with_attempts[-1]
    if last_day == today:
        current = 1
        prev = today
        for day in reversed(days_with_attempts[:-1]):
            if prev - day == timedelta(days=1):
                current += 1
                prev = day
            else:
                break
    elif last_day == today - timedelta(days=1):
        current = 1
    else:
        current = 0

    return {"current_streak": current, "longest_streak": longest}


@api_view(["GET"])
def user_attempt_streak(request, user_id):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    raw_days = request.query_params.get("days", "30")
    try:
        days = int(raw_days)
    except ValueError:
        return Response({"detail": "days must be an integer."}, status=status.HTTP_400_BAD_REQUEST)
    if days <= 0:
        return Response({"detail": "days must be greater than 0."}, status=status.HTTP_400_BAD_REQUEST)

    end_date = timezone.localdate()
    start_date = end_date - timedelta(days=days - 1)

    daily_rows = (
        QuestionAttempt.objects.filter(
            session__user=user,
            answered_at__date__gte=start_date,
            answered_at__date__lte=end_date,
        )
        .annotate(day=TruncDate("answered_at"))
        .values("day")
        .annotate(attempt_count=Count("id"))
        .order_by("day")
    )

    by_day = {row["day"]: row["attempt_count"] for row in daily_rows}

    daily_activity = []
    cursor = start_date
    while cursor <= end_date:
        daily_activity.append(
            {
                "date": cursor.isoformat(),
                "attempt_count": by_day.get(cursor, 0),
            }
        )
        cursor += timedelta(days=1)

    active_days = sorted([day for day, count in by_day.items() if count > 0])
    streak = _compute_streak(active_days)

    return Response(
        {
            "user_id": user.id,
            "range": {
                "from": start_date.isoformat(),
                "to": end_date.isoformat(),
                "days": days,
            },
            "current_streak": streak["current_streak"],
            "longest_streak": streak["longest_streak"],
            "total_active_days": len(active_days),
            "total_attempts": int(sum(by_day.values())),
            "daily_activity": daily_activity,
        },
        status=status.HTTP_200_OK,
    )


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
