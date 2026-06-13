from datetime import timedelta

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Count, F
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from .models import Topic, GameSession, QuestionAttempt, UserProfile
from .serializers import (
    TopicSerializer,
    GameSessionSerializer,
    GameSessionStateUpdateSerializer,
    QuestionAttemptSerializer,
    QuestionAttemptCreateSerializer,
)
from chat.utils import extract_text_by_page
from .utils import generate_quiz


LEVEL_ORDER = ["easy", "medium", "hard", "expert"]
DIFFICULTY_XP = {
    "easy": 10,
    "medium": 15,
    "hard": 20,
    "expert": 30,
}
LEVEL_QUESTION_COUNT = 5


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


def _increment_user_xp(user, amount):
    profile, _ = UserProfile.objects.get_or_create(user=user)

    if amount <= 0:
        return 0, profile.total_xp

    profile.total_xp = F("total_xp") + amount
    profile.save(update_fields=["total_xp"])
    profile.refresh_from_db(fields=["total_xp"])
    return amount, profile.total_xp


def _current_correct_combo(session):
    combo = 0
    attempts = session.attempts.order_by("-answered_at", "-id").values_list("is_correct", flat=True)
    for is_correct in attempts:
        if not is_correct:
            break
        combo += 1
    return combo


def _get_current_daily_streak(user):
    rows = (
        QuestionAttempt.objects.filter(session__user=user, answered_at__date__lte=timezone.localdate())
        .annotate(day=TruncDate("answered_at"))
        .values("day")
        .annotate(attempt_count=Count("id"))
        .order_by("day")
    )
    active_days = sorted(row["day"] for row in rows if row["attempt_count"] > 0)
    return _compute_streak(active_days)["current_streak"]


def _streak_bonus_for_days(streak_days):
    if streak_days >= 30:
        return 50
    if streak_days >= 7:
        return 20
    if streak_days >= 3:
        return 10
    return 0


def _award_streak_bonus_if_needed(session):
    today = timezone.localdate()
    if session.xp_streak_bonus_awarded_on == today:
        return 0

    streak_bonus = _streak_bonus_for_days(_get_current_daily_streak(session.user))
    if streak_bonus <= 0:
        return 0

    session.xp_streak_bonus_awarded_on = today
    session.save(update_fields=["xp_streak_bonus_awarded_on"])
    _increment_user_xp(session.user, streak_bonus)
    return streak_bonus


def _award_level_completion_bonus_if_needed(session, difficulty):
    completed_levels = list(session.xp_completed_levels or [])
    if difficulty in completed_levels:
        return 0

    level_attempts = QuestionAttempt.objects.filter(session=session, difficulty=difficulty)
    answered_count = level_attempts.values("question_id").distinct().count()
    if answered_count < LEVEL_QUESTION_COUNT:
        return 0

    completed_levels.append(difficulty)
    session.xp_completed_levels = completed_levels
    session.save(update_fields=["xp_completed_levels"])
    _increment_user_xp(session.user, 15)
    return 15


def _award_session_completion_bonuses_if_needed(session):
    xp_awarded = 0
    update_fields = []

    if session.status != GameSession.Status.COMPLETED:
        return 0

    if not session.xp_completion_bonus_awarded:
        xp_awarded += 50
        session.xp_completion_bonus_awarded = True
        update_fields.append("xp_completion_bonus_awarded")

    attempts = list(session.attempts.values_list("is_correct", flat=True))
    if attempts:
        correct_count = sum(1 for is_correct in attempts if is_correct)
        accuracy = (correct_count / len(attempts)) * 100

        if accuracy > 80 and not session.xp_accuracy_bonus_awarded:
            xp_awarded += 25
            session.xp_accuracy_bonus_awarded = True
            update_fields.append("xp_accuracy_bonus_awarded")

        if accuracy == 100 and not session.xp_perfect_run_bonus_awarded:
            xp_awarded += 50
            session.xp_perfect_run_bonus_awarded = True
            update_fields.append("xp_perfect_run_bonus_awarded")

    if update_fields:
        session.save(update_fields=update_fields)
        _increment_user_xp(session.user, xp_awarded)

    return xp_awarded


def _award_level_bonuses_from_session_state(session, previous_level):
    xp_awarded = 0
    completed_level_indexes = []

    if session.status == GameSession.Status.COMPLETED:
        completed_level_indexes = range(len(LEVEL_ORDER))
    elif session.current_level > previous_level:
        completed_level_indexes = range(previous_level, min(session.current_level, len(LEVEL_ORDER)))

    for level_index in completed_level_indexes:
        xp_awarded += _award_level_completion_bonus_if_needed(session, LEVEL_ORDER[level_index])

    return xp_awarded


def _calculate_attempt_xp(session, attempt):
    if not attempt.is_correct:
        return 0

    xp = DIFFICULTY_XP.get(attempt.difficulty, 10)
    combo = _current_correct_combo(session)

    if combo == 3:
        xp += 5
    elif combo == 5:
        xp += 10

    level_attempts = QuestionAttempt.objects.filter(session=session, difficulty=attempt.difficulty)
    if level_attempts.count() == LEVEL_QUESTION_COUNT and not level_attempts.filter(is_correct=False).exists():
        xp += 20

    return xp


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

    previous_level = session.current_level

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

    xp_awarded = 0
    xp_awarded += _award_level_bonuses_from_session_state(session, previous_level)
    xp_awarded += _award_session_completion_bonuses_if_needed(session)
    xp_awarded += _award_streak_bonus_if_needed(session)
    _, total_xp = _increment_user_xp(user, 0)

    return Response(
        {
            "session": GameSessionSerializer(session).data,
            "xp_awarded": xp_awarded,
            "total_xp": total_xp,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
def save_question_attempt(request, session_id):
    user, error_response = _resolve_request_user(request)
    if error_response is not None:
        return error_response

    serializer = QuestionAttemptCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    payload = serializer.validated_data

    with transaction.atomic():
        try:
            session = GameSession.objects.select_for_update().select_related("user").get(id=session_id, user=user)
        except GameSession.DoesNotExist:
            return Response({"detail": "Game session not found."}, status=status.HTTP_404_NOT_FOUND)

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

        attempt_xp = _calculate_attempt_xp(session, attempt)
        attempt.xp_awarded = attempt_xp
        attempt.save(update_fields=["xp_awarded"])

        xp_awarded = attempt_xp
        _increment_user_xp(user, attempt_xp)
        xp_awarded += _award_level_completion_bonus_if_needed(session, attempt.difficulty)
        xp_awarded += _award_streak_bonus_if_needed(session)
        _, total_xp = _increment_user_xp(user, 0)

    return Response(
        {
            "attempt": QuestionAttemptSerializer(attempt).data,
            "session_id": str(session.id),
            "xp_awarded": xp_awarded,
            "total_xp": total_xp,
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

    topic_name = (request.data.get("topic") or "").strip()
    if not topic_name:
        return Response({"detail": "topic is required."}, status=status.HTTP_400_BAD_REQUEST)

    description = (request.data.get("description") or "").strip()
    pdf_file = request.FILES.get("file")
    source_filename = pdf_file.name if pdf_file else ""

    topic = Topic.objects.create(
        user=user,
        title=topic_name[:255],
        source_filename=source_filename,
        status=Topic.Status.PROCESSING,
    )

    full_text = ""
    if pdf_file:
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
        quiz = generate_quiz(topic_name=topic_name, description=description, pdf_text=full_text)
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

    with transaction.atomic():
        topic.quiz_data = quiz
        topic.status = Topic.Status.READY
        topic.save(update_fields=["quiz_data", "status"])

    return Response(
        {
            "topic": TopicSerializer(topic).data,
            "quiz": topic.quiz_data,
        },
        status=status.HTTP_201_CREATED,
    )
