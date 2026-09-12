from django.urls import path
from .views import (
    AdminClientAssignmentListAPIView,
    AdminAssignTrainerAPIView,
    AdminReassignTrainerAPIView,
    TrainerAssignedClientListAPIView,
    TrainerAssignedClientDetailAPIView,
    ClientAssignedTrainerAPIView,
    TrainerGroupListCreateAPIView,
    TrainerGroupDetailAPIView,
    TrainerGroupMemberAPIView,
    TrainerGroupMemberRemoveAPIView,
    TrainerGroupEligibleClientsAPIView,
    TrainerGroupAssignWorkoutAPIView,
    TrainerGroupAssignDietAPIView,
)

urlpatterns = [
    # ── Admin Assignment Endpoints ───────────────────────────────────────────
    path("admin/assignments/", AdminClientAssignmentListAPIView.as_view(), name="admin-client-assignments"),
    path("admin/assign/", AdminAssignTrainerAPIView.as_view(), name="admin-assign-trainer"),
    path("admin/reassign/<int:client_id>/", AdminReassignTrainerAPIView.as_view(), name="admin-reassign-trainer"),

    # ── Trainer Endpoints ────────────────────────────────────────────────────
    path("trainer/my-clients/", TrainerAssignedClientListAPIView.as_view(), name="trainer-my-clients"),
    path("trainer/my-clients/<int:client_id>/", TrainerAssignedClientDetailAPIView.as_view(), name="trainer-client-detail"),

    # ── Trainer: Group (Batch) Management ────────────────────────────────────
    path("trainer/groups/",                                         TrainerGroupListCreateAPIView.as_view(),      name="trainer-group-list"),
    path("trainer/groups/<int:group_id>/",                          TrainerGroupDetailAPIView.as_view(),          name="trainer-group-detail"),
    path("trainer/groups/<int:group_id>/members/",                  TrainerGroupMemberAPIView.as_view(),          name="trainer-group-add-member"),
    path("trainer/groups/<int:group_id>/members/<int:ta_id>/",      TrainerGroupMemberRemoveAPIView.as_view(),    name="trainer-group-remove-member"),
    path("trainer/groups/<int:group_id>/eligible-clients/",         TrainerGroupEligibleClientsAPIView.as_view(), name="trainer-group-eligible"),
    path("trainer/groups/<int:group_id>/assign-workout/",           TrainerGroupAssignWorkoutAPIView.as_view(),   name="trainer-group-assign-workout"),
    path("trainer/groups/<int:group_id>/assign-diet/",              TrainerGroupAssignDietAPIView.as_view(),      name="trainer-group-assign-diet"),

    # ── Client Endpoints ─────────────────────────────────────────────────────
    path("client/trainer/", ClientAssignedTrainerAPIView.as_view(), name="client-assigned-trainer"),
]
