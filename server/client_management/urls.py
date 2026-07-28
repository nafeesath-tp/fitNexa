from django.urls import path
from .views import (
    AdminClientAssignmentListAPIView,
    AdminAssignTrainerAPIView,
    AdminReassignTrainerAPIView,
    TrainerAssignedClientListAPIView,
    TrainerAssignedClientDetailAPIView,
    ClientAssignedTrainerAPIView,
)

urlpatterns = [
    # ── Admin Assignment Endpoints ───────────────────────────────────────────
    path("admin/assignments/", AdminClientAssignmentListAPIView.as_view(), name="admin-client-assignments"),
    path("admin/assign/", AdminAssignTrainerAPIView.as_view(), name="admin-assign-trainer"),
    path("admin/reassign/<int:client_id>/", AdminReassignTrainerAPIView.as_view(), name="admin-reassign-trainer"),

    # ── Trainer Endpoints ────────────────────────────────────────────────────
    path("trainer/my-clients/", TrainerAssignedClientListAPIView.as_view(), name="trainer-my-clients"),
    path("trainer/my-clients/<int:client_id>/", TrainerAssignedClientDetailAPIView.as_view(), name="trainer-client-detail"),

    # ── Client Endpoints ─────────────────────────────────────────────────────
    path("client/trainer/", ClientAssignedTrainerAPIView.as_view(), name="client-assigned-trainer"),
]
