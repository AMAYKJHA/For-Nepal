from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from django.shortcuts import redirect

from chat import urls as chat_urls
from accounts import urls as auth_urls
from game import urls as game_urls


def homepage(request):
    return redirect("swagger-ui")

urlpatterns = [
    path("", homepage, name="home-page"),
    path("admin/", admin.site.urls),
    path("api/auth/", include(auth_urls)),
    path("api/chat/", include(chat_urls)),
    path("api/game/", include(game_urls)),

    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]
