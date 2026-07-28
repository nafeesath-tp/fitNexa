from django.urls import path
from .views import (
    TrainerWorkoutPlanListCreateAPIView,
    TrainerWorkoutPlanDetailAPIView,
    TrainerAddWeekAPIView,
    TrainerAddDayAPIView,
    TrainerAddExerciseAPIView,
    TrainerDeleteExerciseAPIView,
    TrainerAssignPlanAPIView,
    TrainerWorkoutAssignmentListAPIView,
    ClientCurrentWorkoutAPIView,
    ClientCompleteDayAPIView,
    ClientWorkoutProgressAPIView,
)

urlpatterns = [
    # ── Trainer: Plan Templates ───────────────────────────────────────────────
    path("trainer/plans/",                                TrainerWorkoutPlanListCreateAPIView.as_view(), name="trainer-plans"),
    path("trainer/plans/<int:plan_id>/",                  TrainerWorkoutPlanDetailAPIView.as_view(),     name="trainer-plan-detail"),

    # ── Trainer: Week / Day / Exercise Builder ────────────────────────────────
    path("trainer/plans/<int:plan_id>/weeks/",                              TrainerAddWeekAPIView.as_view(),     name="trainer-add-week"),
    path("trainer/plans/<int:plan_id>/weeks/<int:week_id>/days/",           TrainerAddDayAPIView.as_view(),      name="trainer-add-day"),
    path("trainer/plans/<int:plan_id>/days/<int:day_id>/exercises/",        TrainerAddExerciseAPIView.as_view(), name="trainer-add-exercise"),
    path("trainer/plans/<int:plan_id>/exercises/<int:exercise_id>/",        TrainerDeleteExerciseAPIView.as_view(), name="trainer-delete-exercise"),

    # ── Trainer: Assignment ───────────────────────────────────────────────────
    path("trainer/plans/<int:plan_id>/assign/",           TrainerAssignPlanAPIView.as_view(),            name="trainer-assign-plan"),
    path("trainer/assignments/",                          TrainerWorkoutAssignmentListAPIView.as_view(), name="trainer-assignments"),

    # ── Client: View & Track ──────────────────────────────────────────────────
    path("client/current/",                               ClientCurrentWorkoutAPIView.as_view(),         name="client-current-workout"),
    path("client/complete-day/<int:day_id>/",             ClientCompleteDayAPIView.as_view(),            name="client-complete-day"),
    path("client/progress/",                              ClientWorkoutProgressAPIView.as_view(),        name="client-workout-progress"),
]
