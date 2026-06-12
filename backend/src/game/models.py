import uuid
from django.db import models
from django.contrib.auth.models import User
from django.conf import settings


class UserProfile(models.Model):
    """
    Extends Django's default User with game-specific fields.
    Created automatically via signal when a User is created.
    """
    user             = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    free_games_used  = models.PositiveIntegerField(default=0)
    is_premium       = models.BooleanField(default=False)

    def can_play(self):
        return self.is_premium or self.free_games_used < settings.FREE_GAMES

    def __str__(self):
        return f"Profile({self.user.username})"


class Topic(models.Model):
    """
    Represents one uploaded PDF + its LLM-generated quiz data.
    quiz_data stores the full JSON returned by the LLM:
    {
        "topic": "...",
        "levels": {
            "easy":   [ {id, question, options, correct_index, explanation}, ... ],
            "medium": [ ... ],
            "hard":   [ ... ],
            "expert": [ ... ]
        }
    }
    """
    class Status(models.TextChoices):
        PROCESSING = 'processing', 'Processing'
        READY      = 'ready',      'Ready'
        FAILED     = 'failed',     'Failed'
        
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user            = models.ForeignKey(User, on_delete=models.CASCADE, related_name='topics')
    title           = models.CharField(max_length=255)
    source_filename = models.CharField(max_length=255)
    quiz_data       = models.JSONField(default=dict)
    status          = models.CharField(max_length=20, choices=Status.choices, default=Status.PROCESSING)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.user.username})"


class GameSession(models.Model):
    """
    One full playthrough of a topic (all 4 levels = Easy → Expert).
    Tracks live HP/score so the frontend can sync state.
    current_level: 0=easy, 1=medium, 2=hard, 3=expert
    """
    class Status(models.TextChoices):
        ACTIVE    = 'active',    'Active'
        COMPLETED = 'completed', 'Completed'   # beat all 4 levels
        DEFEATED  = 'defeated',  'Defeated'    # player HP hit 0

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user          = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    topic         = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='sessions')
    current_level = models.PositiveSmallIntegerField(default=0)
    player_hp     = models.IntegerField(default=100)
    enemy_hp      = models.IntegerField(default=100)
    score         = models.IntegerField(default=0)
    status        = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    started_at    = models.DateTimeField(auto_now_add=True)
    completed_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.user.username} | {self.topic.title} | {self.status}"


class QuestionAttempt(models.Model):
    """
    One answer event inside a GameSession.
    question_id matches the 'id' field inside Topic.quiz_data JSON.
    difficulty matches the level key: easy / medium / hard / expert.
    """
    DIFFICULTY_CHOICES = [
        ('easy',   'Easy'),
        ('medium', 'Medium'),
        ('hard',   'Hard'),
        ('expert', 'Expert'),
    ]

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session       = models.ForeignKey(GameSession, on_delete=models.CASCADE, related_name='attempts')
    question_id   = models.PositiveSmallIntegerField()   # matches id in quiz_data JSON
    difficulty    = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES)
    chosen_index  = models.PositiveSmallIntegerField()   # 0–3
    correct_index = models.PositiveSmallIntegerField()   # 0–3
    is_correct    = models.BooleanField()
    answered_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['answered_at']

    def __str__(self):
        status = "Tick" if self.is_correct else "Cross"
        return f"{status} Q{self.question_id} ({self.difficulty}) — session {self.session_id}"


# ---------------------------------------------------------------------------
# Signal: auto-create UserProfile when a User is registered
# ---------------------------------------------------------------------------
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()