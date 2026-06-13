from django.db import models
from pgvector.django import VectorField
import uuid
from django.utils import timezone

from django.contrib.auth.models import User


class Memory(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user       = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)  # FIX: moved inside class
    question   = models.TextField()
    answer     = models.TextField()
    topic      = models.CharField(max_length=100, default='General')
    summary    = models.TextField(blank=True, null=True)
    importance_score = models.FloatField(default=0.5)
    learning_progress = models.JSONField(default=dict, blank=True)
    embedding  = VectorField(dimensions=3072, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'memories'
        ordering = ['-created_at']


class Flashcard(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    memory     = models.ForeignKey(Memory, on_delete=models.CASCADE, related_name='flashcards')
    front      = models.TextField()
    back       = models.TextField()
    ease_factor = models.FloatField(default=2.5)
    interval_days = models.IntegerField(default=0)
    repetition_count = models.IntegerField(default=0)
    next_review_date = models.DateField(default=timezone.localdate)
    last_review_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'flashcards'
        ordering = ['-created_at']


class ChatSession(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title      = models.TextField(default='New Chat')
    topic      = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'chat_sessions'
        ordering = ['-updated_at']


class ChatMessage(models.Model):
    ROLE_CHOICES = [('user', 'User'), ('assistant', 'Assistant')]
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session    = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    role       = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content    = models.TextField()
    image_url  = models.TextField(blank=True, null=True)
    topic      = models.CharField(max_length=100, blank=True, null=True)
    memory     = models.ForeignKey(Memory, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'chat_messages'
        ordering = ['created_at']

class PDFDocument(models.Model):
    """Stores uploaded PDF metadata and summary."""
    title = models.CharField(max_length=255)
    filename = models.CharField(max_length=255)
    user_prompt = models.TextField(blank=True)        # optional prompt from user at upload
    summary = models.TextField(blank=True)            # AI-generated summary
    page_count = models.IntegerField(default=0)
    topic = models.CharField(max_length=100, default='General')
    concepts = models.JSONField(default=list, blank=True)
    definitions = models.JSONField(default=list, blank=True)
    relationships = models.JSONField(default=list, blank=True)
    mastered = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class PDFChunk(models.Model):
    """One embedded chunk from a PDF page / paragraph."""
    document = models.ForeignKey(PDFDocument, on_delete=models.CASCADE, related_name='chunks')
    content = models.TextField()
    page_number = models.IntegerField(default=0)
    embedding = VectorField(dimensions=3072)          # gemini-embedding-001

    def __str__(self):
        return f"{self.document.title} – chunk {self.id}"


class PDFQuiz(models.Model):
    """A single quiz question linked to a PDF."""
    DIFFICULTY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
        ('expert', 'Expert'),
    ]

    document = models.ForeignKey(PDFDocument, on_delete=models.CASCADE, related_name='quizzes')
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    question = models.TextField()
    options = models.JSONField()          # list of 4 strings: ["A. ...", "B. ...", ...]
    answer = models.CharField(max_length=1)  # "A", "B", "C", or "D"
    explanation = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.difficulty}] {self.question[:60]}"


class ReviewLog(models.Model):
    RATING_CHOICES = [
        (0, 'Again'),
        (3, 'Hard'),
        (4, 'Good'),
        (5, 'Easy'),
    ]

    flashcard = models.ForeignKey(Flashcard, on_delete=models.CASCADE, related_name='review_logs')
    rating = models.IntegerField(choices=RATING_CHOICES)
    reviewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'review_logs'
        ordering = ['-reviewed_at']


class TopicMastery(models.Model):
    topic = models.CharField(max_length=100, unique=True)
    mastery_score = models.FloatField(default=0.0)
    correct_answers = models.IntegerField(default=0)
    incorrect_answers = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'topic_mastery'
        ordering = ['mastery_score', '-last_updated']


class QuizAttempt(models.Model):
    source = models.CharField(max_length=20, default='pdf')
    topic = models.CharField(max_length=100, default='General')
    score = models.FloatField(default=0.0)
    correct = models.IntegerField(default=0)
    total = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'quiz_attempts'
        ordering = ['-created_at']