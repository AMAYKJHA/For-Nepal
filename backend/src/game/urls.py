from django.urls import path
from . import views

urlpatterns = [
    path("users/<int:user_id>/topics", views.user_topics, name="user-topics"),
    path("topics/upload", views.topic_upload, name="topic-upload"),
    path("topics/<uuid:topic_id>/session", views.topic_session, name="topic-session"),
    path("sessions/<uuid:session_id>/state", views.submit_game_state, name="submit-game-state"),
]
