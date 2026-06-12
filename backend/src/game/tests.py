from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from unittest.mock import patch

from .models import Topic


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
