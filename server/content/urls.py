from django.urls import path
from .views import (
    ClientVideoListAPIView,
    ClientVideoDetailAPIView,
    AdminVideoListCreateAPIView,
    AdminVideoDetailAPIView,
)

urlpatterns = [
    # ── Client Endpoints ─────────────────────────────────────────────────────
    path("client/videos/", ClientVideoListAPIView.as_view(), name="client-video-list"),
    path("client/videos/<int:video_id>/", ClientVideoDetailAPIView.as_view(), name="client-video-detail"),

    # ── Admin Endpoints ──────────────────────────────────────────────────────
    path("admin/videos/", AdminVideoListCreateAPIView.as_view(), name="admin-video-list-create"),
    path("admin/videos/<int:video_id>/", AdminVideoDetailAPIView.as_view(), name="admin-video-detail"),
]
