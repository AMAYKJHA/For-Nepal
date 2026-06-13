from django.urls import path
from . import views

urlpatterns = [
    path('chat/',                                views.ChatView.as_view()),
    path('models/',                              views.ModelsView.as_view()),  # ← new
    path('memories/',                            views.MemoryListView.as_view()),
    path('search/',                              views.SearchView.as_view()),
    path('summarize/',                           views.SummarizeView.as_view()),
    path('flashcards/',                          views.FlashcardListView.as_view()),
    path('flashcards/bulk/',                     views.BulkFlashcardsView.as_view()),
    path('reviews/today/',                       views.TodayReviewsView.as_view()),
    path('reviews/submit/',                      views.SubmitReviewView.as_view()),
    path('mastery/',                             views.TopicMasteryView.as_view()),
    path('analytics/learning/',                  views.LearningAnalyticsView.as_view()),
    path('concept-map/',                         views.ConceptMapView.as_view()),
    path('quizzes/adaptive/generate/',           views.AdaptiveQuizGenerateView.as_view()),
    path('topics/',                              views.TopicsView.as_view()),
    path('sessions/',                            views.ChatSessionListView.as_view()),
    path('sessions/<uuid:session_id>/',          views.ChatSessionDetailView.as_view()),
    path('sessions/<uuid:session_id>/messages/', views.ChatSessionMessagesView.as_view()),
    path('format-memory/',                       views.FormatMemoryView.as_view()),
    path("pdf/",                                 views.list_pdfs,       name="pdf-list"),
    path("pdf/upload/",                          views.upload_pdf,      name="pdf-upload"),
    path("pdf/<int:doc_id>/",                    views.pdf_detail,      name="pdf-detail"),
    path("pdf/<int:doc_id>/chat/",               views.chat_with_pdf,   name="pdf-chat"),
    path("pdf/<int:doc_id>/quiz/generate/",      views.generate_quiz,   name="pdf-quiz-generate"),
    path("pdf/<int:doc_id>/quiz/",               views.get_quiz,        name="pdf-quiz"),
    path("pdf/<int:doc_id>/quiz/submit/",        views.submit_quiz,     name="pdf-quiz-submit"),
    path("pdf/<int:doc_id>/master/",             views.mark_mastered,   name="pdf-master"),
]
