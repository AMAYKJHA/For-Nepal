from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from unittest.mock import patch

from .models import Topic, GameSession


class TopicUploadTests(TestCase):
	def setUp(self):
		self.user = User.objects.create_user(username="testuser", password="secret123")

	@patch("game.views.generate_quiz")
	@patch("game.views.extract_text_by_page")
	def test_topic_upload_saves_generated_quiz(self, mock_extract_text_by_page, mock_generate_quiz):
		mock_extract_text_by_page.return_value = [{"page": 1, "text": "Sample content"}]
		mock_generate_quiz.return_value = {
			"topic": "Algebra",
			"levels": {
				"easy": [
					{
						"id": 1,
						"question": "2 + 2 = ?",
						"options": ["1", "2", "4", "5"],
						"correct_index": 2,
						"explanation": "Basic arithmetic",
					}
				]
			},
		}

		upload_file = SimpleUploadedFile(
			"algebra.pdf",
			b"%PDF-1.4 fake pdf",
			content_type="application/pdf",
		)

		response = self.client.post(
			"/api/game/topics/upload",
			{"file": upload_file, "user_id": str(self.user.id)},
		)

		self.assertEqual(response.status_code, 201)
		self.assertEqual(Topic.objects.count(), 1)

		topic = Topic.objects.first()
		self.assertEqual(topic.user_id, self.user.id)
		self.assertEqual(topic.status, Topic.Status.READY)
		self.assertEqual(topic.source_filename, "algebra.pdf")
		self.assertEqual(topic.quiz_data["topic"], "Algebra")

	@patch("game.views.generate_quiz")
	@patch("game.views.extract_text_by_page")
	def test_topic_upload_accepts_x_user_id_header(self, mock_extract_text_by_page, mock_generate_quiz):
		mock_extract_text_by_page.return_value = [{"page": 1, "text": "Sample content"}]
		mock_generate_quiz.return_value = {"topic": "Physics", "levels": {}}

		upload_file = SimpleUploadedFile(
			"physics.pdf",
			b"%PDF-1.4 fake pdf",
			content_type="application/pdf",
		)

		response = self.client.post(
			"/api/game/topics/upload",
			{"file": upload_file},
			HTTP_X_USER_ID=str(self.user.id),
		)

		self.assertEqual(response.status_code, 201)
		self.assertEqual(Topic.objects.count(), 1)


class TopicSessionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="sessionuser", password="secret123")
        self.other_user = User.objects.create_user(username="otheruser", password="secret123")
        self.topic = Topic.objects.create(
            user=self.user,
            title="Networks",
            source_filename="networks.pdf",
            quiz_data={"topic": "Networks", "levels": {"easy": [], "medium": [], "hard": [], "expert": []}},
            status=Topic.Status.READY,
        )

    def test_topic_session_creates_if_missing(self):
        response = self.client.get(
            f"/api/game/topics/{self.topic.id}/session",
            {"user_id": self.user.id},
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["created"])
        self.assertEqual(GameSession.objects.count(), 1)
        session = GameSession.objects.first()
        self.assertEqual(session.user_id, self.user.id)
        self.assertEqual(session.topic_id, self.topic.id)

    def test_topic_session_returns_existing(self):
        existing = GameSession.objects.create(user=self.user, topic=self.topic, score=30)

        response = self.client.get(
            f"/api/game/topics/{self.topic.id}/session",
            {"user_id": self.user.id},
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["created"])
        self.assertEqual(response.json()["session"]["id"], str(existing.id))
        self.assertEqual(GameSession.objects.count(), 1)

    def test_topic_session_returns_404_for_foreign_topic(self):
        response = self.client.get(
            f"/api/game/topics/{self.topic.id}/session",
            {"user_id": self.other_user.id},
        )

        self.assertEqual(response.status_code, 404)

    def test_topic_session_requires_user_id_when_unauthenticated(self):
        response = self.client.get(f"/api/game/topics/{self.topic.id}/session")

        self.assertEqual(response.status_code, 400)


class SubmitGameStateTests(TestCase):
	def setUp(self):
		self.user = User.objects.create_user(username="player1", password="secret123")
		self.other_user = User.objects.create_user(username="player2", password="secret123")
		self.topic = Topic.objects.create(
			user=self.user,
			title="Algorithms",
			source_filename="algo.pdf",
			quiz_data={"topic": "Algorithms", "levels": {"easy": [], "medium": [], "hard": [], "expert": []}},
			status=Topic.Status.READY,
		)
		self.session = GameSession.objects.create(user=self.user, topic=self.topic)

	def test_submit_game_state_updates_session(self):
		response = self.client.patch(
			f"/api/game/sessions/{self.session.id}/state",
			data={
				"current_level": 1,
				"player_hp": 82,
				"enemy_hp": 61,
				"score": 120,
				"status": "active",
				"user_id": self.user.id,
			},
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 200)
		self.session.refresh_from_db()
		self.assertEqual(self.session.current_level, 1)
		self.assertEqual(self.session.player_hp, 82)
		self.assertEqual(self.session.enemy_hp, 61)
		self.assertEqual(self.session.score, 120)
		self.assertEqual(self.session.status, GameSession.Status.ACTIVE)

	def test_submit_game_state_sets_completed_at_when_completed(self):
		response = self.client.patch(
			f"/api/game/sessions/{self.session.id}/state",
			data={"status": "completed", "user_id": self.user.id},
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 200)
		self.session.refresh_from_db()
		self.assertEqual(self.session.status, GameSession.Status.COMPLETED)
		self.assertIsNotNone(self.session.completed_at)

	def test_submit_game_state_rejects_empty_payload(self):
		response = self.client.patch(
			f"/api/game/sessions/{self.session.id}/state",
			data={"user_id": self.user.id},
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 400)

	def test_submit_game_state_rejects_foreign_user(self):
		response = self.client.patch(
			f"/api/game/sessions/{self.session.id}/state",
			data={"score": 10, "user_id": self.other_user.id},
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 404)
