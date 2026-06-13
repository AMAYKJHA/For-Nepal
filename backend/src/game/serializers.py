from rest_framework import serializers
from .models import Topic, GameSession, QuestionAttempt


class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ["id", "title", "source_filename", "status", "created_at"]

class TopicSerializerForGameSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ["id", "title", "source_filename", "quiz_data", "status", "created_at"]

class GameSessionSerializer(serializers.ModelSerializer):
    topic = TopicSerializerForGameSessionSerializer(read_only=True)
    level_name = serializers.SerializerMethodField()
    attempts_count = serializers.SerializerMethodField()
    total_questions = serializers.SerializerMethodField()

    class Meta:
        model = GameSession
        fields = [
            "id",
            "user_id",
            "topic",
            "current_level",
            "level_name",
            "player_hp",
            "enemy_hp",
            "score",
            "status",
            "attempts_count",
            "total_questions",
            "started_at",
            "completed_at",
        ]

    def get_level_name(self, obj):
        level_map = {
            0: "easy",
            1: "medium",
            2: "hard",
            3: "expert",
        }
        return level_map.get(obj.current_level, "easy")

    def get_attempts_count(self, obj):
        return obj.attempts.count()

    def get_total_questions(self, obj):
        levels = obj.topic.quiz_data.get("levels", {}) if isinstance(obj.topic.quiz_data, dict) else {}
        total = 0
        for level_questions in levels.values():
            if isinstance(level_questions, list):
                total += len(level_questions)
        return total


class GameSessionStateUpdateSerializer(serializers.Serializer):
    current_level = serializers.IntegerField(min_value=0, max_value=3, required=False)
    player_hp = serializers.IntegerField(required=False)
    enemy_hp = serializers.IntegerField(required=False)
    score = serializers.IntegerField(required=False)
    status = serializers.ChoiceField(choices=GameSession.Status.choices, required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                "At least one state field is required: current_level, player_hp, enemy_hp, score, status."
            )
        return attrs


class QuestionAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionAttempt
        fields = [
            "id",
            "session_id",
            "question_id",
            "difficulty",
            "chosen_index",
            "correct_index",
            "is_correct",
            "xp_awarded",
            "answered_at",
        ]


class QuestionAttemptCreateSerializer(serializers.Serializer):
    question_id = serializers.IntegerField(min_value=1)
    difficulty = serializers.ChoiceField(choices=[choice[0] for choice in QuestionAttempt.DIFFICULTY_CHOICES])
    chosen_index = serializers.IntegerField(min_value=0)
    correct_index = serializers.IntegerField(min_value=0)

    def validate(self, attrs):
        # Keep consistency with 4-choice quiz format.
        if attrs["chosen_index"] > 3 or attrs["correct_index"] > 3:
            raise serializers.ValidationError("chosen_index and correct_index must be between 0 and 3.")
        return attrs
