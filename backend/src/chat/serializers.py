from rest_framework import serializers
from .models import Memory, Flashcard, ChatSession, ChatMessage, TopicMastery


class MemorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Memory
        fields = [
            'id', 'question', 'answer', 'topic', 'summary',
            'importance_score', 'learning_progress', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class FlashcardSerializer(serializers.ModelSerializer):
    topic = serializers.CharField(source='memory.topic', read_only=True, default='General')

    class Meta:
        model  = Flashcard
        fields = [
            'id', 'memory_id', 'front', 'back', 'topic',
            'ease_factor', 'interval_days', 'repetition_count',
            'next_review_date', 'last_review_date', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ChatSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ChatSession
        fields = ['id', 'title', 'topic', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ChatMessage
        fields = ['id', 'session_id', 'role', 'content', 'image_url', 'topic', 'memory_id', 'created_at']
        read_only_fields = ['id', 'created_at']


class ChatRequestSerializer(serializers.Serializer):
    message              = serializers.CharField()
    conversation_history = serializers.ListField(child=serializers.DictField(), required=False, default=[])
    image_base64         = serializers.CharField(required=False, allow_null=True)
    tutor_mode           = serializers.BooleanField(required=False, default=False)


class SearchRequestSerializer(serializers.Serializer):
    query = serializers.CharField()


class SummarizeRequestSerializer(serializers.Serializer):
    memory_id = serializers.UUIDField()


class ReviewSubmitSerializer(serializers.Serializer):
    flashcard_id = serializers.UUIDField()
    difficulty = serializers.ChoiceField(choices=['again', 'hard', 'good', 'easy'])


class TopicMasterySerializer(serializers.ModelSerializer):
    class Meta:
        model = TopicMastery
        fields = ['topic', 'mastery_score', 'correct_answers', 'incorrect_answers', 'last_updated']