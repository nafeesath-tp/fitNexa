from django.urls import path
from .views import (
    ClientGenerateAIPlanView,
    ClientMyAIPlansView,
    ClientAIPlanDetailView,
    TrainerAIPlanPendingView,
    TrainerAllAIPlansView,
    TrainerAIPlanDetailView,
    TrainerApproveAIPlanView,
    TrainerRejectAIPlanView,
    TrainerGenerateNextWeekView,
)

urlpatterns = [
    # ── Client endpoints ──────────────────────────────────────────────────────
    path("generate/",               ClientGenerateAIPlanView.as_view(),  name="ai-generate"),
    path("my-plans/",               ClientMyAIPlansView.as_view(),       name="ai-my-plans"),
    path("my-plans/<int:pk>/",      ClientAIPlanDetailView.as_view(),    name="ai-plan-detail"),

    # ── Trainer endpoints ─────────────────────────────────────────────────────
    path("trainer/pending/",                      TrainerAIPlanPendingView.as_view(),       name="ai-trainer-pending"),
    path("trainer/all/",                          TrainerAllAIPlansView.as_view(),          name="ai-trainer-all"),
    path("trainer/<int:pk>/",                     TrainerAIPlanDetailView.as_view(),        name="ai-trainer-detail"),
    path("trainer/<int:pk>/approve/",             TrainerApproveAIPlanView.as_view(),       name="ai-trainer-approve"),
    path("trainer/<int:pk>/regenerate/",          TrainerRejectAIPlanView.as_view(),        name="ai-trainer-regenerate"),
    path("trainer/<int:pk>/next-week/",           TrainerGenerateNextWeekView.as_view(),    name="ai-trainer-next-week"),
]
