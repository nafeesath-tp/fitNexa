from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db import transaction

from .models import WorkoutPlan, WorkoutWeek, WorkoutDay, WorkoutExercise, WorkoutAssignment, WorkoutCompletion
from .serializers import (
    WorkoutPlanListSerializer, WorkoutPlanDetailSerializer,
    WorkoutPlanWriteSerializer, WorkoutAssignmentListSerializer,
    ClientWorkoutCurrentSerializer, WorkoutCompletionSerializer,
)
from client_management.models import TrainerAssignment


# ── Trainer: Plan Template CRUD ───────────────────────────────────────────────

def get_trainer_plans(trainer_user):
    """Returns all active workout plan templates created by this trainer."""
    plans = WorkoutPlan.objects.filter(trainer=trainer_user, is_active=True)
    return WorkoutPlanListSerializer(plans, many=True).data


def create_workout_plan(trainer_user, data):
    """Creates a new workout plan template for the trainer."""
    serializer = WorkoutPlanWriteSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    plan = serializer.save(trainer=trainer_user)
    return WorkoutPlanDetailSerializer(plan).data


def get_plan_detail(trainer_user, plan_id):
    """
    Returns full nested plan structure (weeks → days → exercises).
    Trainers can only view their own plans.
    """
    plan = get_object_or_404(WorkoutPlan, id=plan_id, is_active=True)
    if plan.trainer != trainer_user:
        raise PermissionDenied("You do not have permission to view this plan.")
    return WorkoutPlanDetailSerializer(plan).data


def update_workout_plan(trainer_user, plan_id, data, partial=False):
    """Updates plan-level metadata (title, description, difficulty, duration_weeks)."""
    plan = get_object_or_404(WorkoutPlan, id=plan_id, trainer=trainer_user, is_active=True)
    serializer = WorkoutPlanWriteSerializer(plan, data=data, partial=partial)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return WorkoutPlanDetailSerializer(plan).data


def delete_workout_plan(trainer_user, plan_id):
    """Soft-deletes (deactivates) a workout plan."""
    plan = get_object_or_404(WorkoutPlan, id=plan_id, trainer=trainer_user, is_active=True)
    plan.is_active = False
    plan.save(update_fields=["is_active"])


# ── Trainer: Week / Day / Exercise Builder ─────────────────────────────────────

def add_week(trainer_user, plan_id, data):
    """Appends a new week to a plan."""
    plan = get_object_or_404(WorkoutPlan, id=plan_id, trainer=trainer_user, is_active=True)
    week_number = plan.weeks.count() + 1
    week = WorkoutWeek.objects.create(
        plan=plan,
        week_number=data.get("week_number", week_number),
        title=data.get("title", f"Week {week_number}"),
    )
    return {"id": week.id, "week_number": week.week_number, "title": week.title}


def add_day(trainer_user, plan_id, week_id, data):
    """Appends a new day to a week, ensuring trainer owns the plan."""
    plan = get_object_or_404(WorkoutPlan, id=plan_id, trainer=trainer_user, is_active=True)
    week = get_object_or_404(WorkoutWeek, id=week_id, plan=plan)
    day = WorkoutDay.objects.create(
        week=week,
        day_number=data.get("day_number", week.days.count() + 1),
        title=data.get("title", ""),
        is_rest_day=data.get("is_rest_day", False),
    )
    return {"id": day.id, "day_number": day.day_number, "title": day.title}


def add_exercise(trainer_user, plan_id, day_id, data):
    """Appends an exercise to a day."""
    plan = get_object_or_404(WorkoutPlan, id=plan_id, trainer=trainer_user, is_active=True)
    day = get_object_or_404(WorkoutDay, id=day_id, week__plan=plan)
    exercise = WorkoutExercise.objects.create(
        day=day,
        exercise_name=data.get("exercise_name"),
        sets=data.get("sets", 3),
        reps=data.get("reps", "10"),
        rest_seconds=data.get("rest_seconds", 60),
        notes=data.get("notes", ""),
        demo_video_url=data.get("demo_video_url", ""),
        order=data.get("order", day.exercises.count() + 1),
    )
    return {
        "id": exercise.id,
        "exercise_name": exercise.exercise_name,
        "sets": exercise.sets,
        "reps": exercise.reps,
    }


def delete_exercise(trainer_user, plan_id, exercise_id):
    """Removes an exercise by ID (hard delete — exercises are leaf nodes)."""
    plan = get_object_or_404(WorkoutPlan, id=plan_id, trainer=trainer_user, is_active=True)
    exercise = get_object_or_404(WorkoutExercise, id=exercise_id, day__week__plan=plan)
    exercise.delete()


# ── Trainer: Assign Plan to Client ──────────────────────────────────────────────

def assign_plan_to_client(trainer_user, plan_id, trainer_assignment_id):
    """
    Creates (or reactivates) a WorkoutAssignment linking a plan to a TrainerAssignment.
    The trainer must own both the plan and the TrainerAssignment.
    """
    plan = get_object_or_404(WorkoutPlan, id=plan_id, trainer=trainer_user, is_active=True)
    ta   = get_object_or_404(TrainerAssignment, id=trainer_assignment_id, trainer=trainer_user, is_active=True)

    # Deactivate any previous active assignment for this client
    WorkoutAssignment.objects.filter(trainer_assignment=ta, is_active=True).update(is_active=False)

    assignment = WorkoutAssignment.objects.create(plan=plan, trainer_assignment=ta, is_active=True)
    return {"assignment_id": assignment.id, "plan_title": plan.title}


def get_trainer_assignments(trainer_user):
    """Returns all workout assignments made by this trainer."""
    assignments = WorkoutAssignment.objects.filter(
        trainer_assignment__trainer=trainer_user,
        is_active=True,
    ).select_related("plan", "trainer_assignment__client", "trainer_assignment__client__client_profile")
    return WorkoutAssignmentListSerializer(assignments, many=True).data


# ── Client: View & Track Workout ───────────────────────────────────────────────

def get_client_current_workout(client_user):
    """
    Returns the client's current active workout assignment with full
    plan structure and daily progress state.
    Endpoint: GET /api/workouts/client/current/
    """
    ta = TrainerAssignment.objects.filter(client=client_user, is_active=True).first()
    if not ta:
        return None

    assignment = WorkoutAssignment.objects.filter(
        trainer_assignment=ta, is_active=True
    ).select_related("plan").prefetch_related(
        "plan__weeks__days__exercises",
        "completions",
    ).order_by("-assigned_at").first()

    if not assignment:
        return None

    return ClientWorkoutCurrentSerializer(assignment).data


def complete_workout_day(client_user, day_id, notes=""):
    """
    Marks a workout day as complete for the client.
    Validates that the day belongs to the client's active assignment.
    unique_together on (assignment, day) prevents duplicates.
    """
    ta = get_object_or_404(TrainerAssignment, client=client_user, is_active=True)
    assignment = get_object_or_404(WorkoutAssignment, trainer_assignment=ta, is_active=True)
    day = get_object_or_404(WorkoutDay, id=day_id, week__plan=assignment.plan)

    completion, created = WorkoutCompletion.objects.get_or_create(
        assignment=assignment,
        day=day,
        defaults={"notes": notes},
    )
    if not created:
        raise ValidationError("This day has already been marked as complete.")

    return {
        "completed_day_id": day.id,
        "day_title": day.title,
        "message": f"Day {day.day_number} marked complete! 💪",
    }


def get_client_progress(client_user):
    """
    Returns overall progress stats: completed days, total days, %.
    """
    ta = TrainerAssignment.objects.filter(client=client_user, is_active=True).first()
    if not ta:
        return {"progress_pct": 0, "completed_days": 0, "total_days": 0}

    assignment = WorkoutAssignment.objects.filter(
        trainer_assignment=ta, is_active=True
    ).first()

    if not assignment:
        return {"progress_pct": 0, "completed_days": 0, "total_days": 0}

    total     = WorkoutDay.objects.filter(week__plan=assignment.plan).count()
    completed = assignment.completions.count()
    pct       = round((completed / total) * 100) if total > 0 else 0

    return {
        "progress_pct": pct,
        "completed_days": completed,
        "total_days": total,
        "plan_title": assignment.plan.title,
    }
