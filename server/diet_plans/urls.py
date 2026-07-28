from django.urls import path
from .views import (
    TrainerDietPlanListCreateAPIView,
    TrainerDietPlanDetailAPIView,
    TrainerAddWeekAPIView,
    TrainerDeleteWeekAPIView,
    TrainerAddDayAPIView,
    TrainerDeleteDayAPIView,
    TrainerAddMealAPIView,
    TrainerMealDetailAPIView,
    TrainerAssignDietAPIView,
    TrainerDietAssignmentListAPIView,
    ClientCurrentDietAPIView,
    ClientCompleteMealAPIView,
    ClientDietProgressAPIView,
)

urlpatterns = [
    # ── Trainer: Plan Templates ───────────────────────────────────────────────
    path("trainer/plans/",                                TrainerDietPlanListCreateAPIView.as_view(), name="trainer-diet-plans"),
    path("trainer/plans/<int:plan_id>/",                  TrainerDietPlanDetailAPIView.as_view(),     name="trainer-diet-plan-detail"),

    # ── Trainer: Week / Day / Meal Builder ────────────────────────────────────
    path("trainer/plans/<int:plan_id>/weeks/",                              TrainerAddWeekAPIView.as_view(),     name="trainer-add-week"),
    path("trainer/plans/<int:plan_id>/weeks/<int:week_id>/",                TrainerDeleteWeekAPIView.as_view(),  name="trainer-delete-week"),
    path("trainer/plans/<int:plan_id>/weeks/<int:week_id>/days/",           TrainerAddDayAPIView.as_view(),      name="trainer-add-day"),
    path("trainer/plans/<int:plan_id>/days/<int:day_id>/",                  TrainerDeleteDayAPIView.as_view(),   name="trainer-delete-day"),
    path("trainer/plans/<int:plan_id>/days/<int:day_id>/meals/",            TrainerAddMealAPIView.as_view(),     name="trainer-add-meal"),
    path("trainer/plans/<int:plan_id>/meals/<int:meal_id>/",                TrainerMealDetailAPIView.as_view(),  name="trainer-meal-detail"),

    # ── Trainer: Assignment ───────────────────────────────────────────────────
    path("trainer/plans/<int:plan_id>/assign/",           TrainerAssignDietAPIView.as_view(),            name="trainer-assign-diet"),
    path("trainer/assignments/",                          TrainerDietAssignmentListAPIView.as_view(),    name="trainer-diet-assignments"),

    # ── Client: View & Track ──────────────────────────────────────────────────
    path("client/current/",                               ClientCurrentDietAPIView.as_view(),            name="client-current-diet"),
    path("client/complete-meal/<int:meal_id>/",           ClientCompleteMealAPIView.as_view(),           name="client-complete-meal"),
    path("client/progress/",                              ClientDietProgressAPIView.as_view(),           name="client-diet-progress"),
]
