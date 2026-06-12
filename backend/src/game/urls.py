from django.urls import path
from . import views

urlpatterns = [
    path("users/<int:user_id>/topics", views.user_topics, name="user-topics"),
    path("topics/upload", views.topic_upload, name="topic-upload"),
]
