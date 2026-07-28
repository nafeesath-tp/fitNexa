from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db import transaction

from .models import DietPlan, DietWeek, DietDay, DietMeal, DietAssignment, DietProgress
from .serializers import (
    DietPlanListSerializer, DietPlanDetailSerializer,
    DietPlanWriteSerializer, DietAssignmentListSerializer,
    ClientDietCurrentSerializer, DietProgressSerializer,
)
from client_management.models import TrainerAssignment


# ── Trainer: Plan Template CRUD ───────────────────────────────────────────────

def get_trainer_plans(trainer_user):
    """Returns all active diet plan templates created by this trainer."""
    plans = DietPlan.objects.filter(trainer=trainer_user, is_active=True)
    return DietPlanListSerializer(plans, many=True).data


def create_diet_plan(trainer_user, data):
    """Creates a new diet plan template for the trainer."""
    serializer = DietPlanWriteSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    plan = serializer.save(trainer=trainer_user)
    return DietPlanDetailSerializer(plan).data


def get_plan_detail(trainer_user, plan_id):
    """
    Returns full nested plan structure (weeks → days → meals).
    Trainers can only view their own plans.
    """
    plan = get_object_or_404(DietPlan, id=plan_id, is_active=True)
    if plan.trainer != trainer_user:
        raise PermissionDenied("You do not have permission to view this diet plan.")
    return DietPlanDetailSerializer(plan).data


def update_diet_plan(trainer_user, plan_id, data, partial=False):
    """Updates plan-level metadata (title, description, calories, goal, duration_weeks)."""
    plan = get_object_or_404(DietPlan, id=plan_id, trainer=trainer_user, is_active=True)
    serializer = DietPlanWriteSerializer(plan, data=data, partial=partial)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return DietPlanDetailSerializer(plan).data


def delete_diet_plan(trainer_user, plan_id):
    """Soft-deletes (deactivates) a diet plan."""
    plan = get_object_or_404(DietPlan, id=plan_id, trainer=trainer_user, is_active=True)
    plan.is_active = False
    plan.save(update_fields=["is_active"])


# ── Trainer: Week / Day / Meal Builder ────────────────────────────────────────

def add_week(trainer_user, plan_id, data):
    """Appends a new week to a diet plan."""
    plan = get_object_or_404(DietPlan, id=plan_id, trainer=trainer_user, is_active=True)
    week_number = data.get("week_number") or (plan.weeks.count() + 1)
    title       = data.get("title", f"Week {week_number}")

    if DietWeek.objects.filter(plan=plan, week_number=week_number).exists():
        raise ValidationError(f"Week {week_number} already exists in this plan.")

    week = DietWeek.objects.create(plan=plan, week_number=week_number, title=title)
    return {"week_id": week.id, "week_number": week.week_number, "title": week.title}


def delete_week(trainer_user, week_id):
    """Deletes a week and all its days and meals."""
    week = get_object_or_404(DietWeek, id=week_id, plan__trainer=trainer_user, plan__is_active=True)
    week.delete()


def add_day(trainer_user, week_id, data):
    """Adds a day to a specific diet week."""
    week = get_object_or_404(DietWeek, id=week_id, plan__trainer=trainer_user, plan__is_active=True)
    day_number  = data.get("day_number") or (week.days.count() + 1)
    title       = data.get("title", f"Day {day_number}")
    is_cheat    = data.get("is_cheat_day", False)
    water       = data.get("water_target_liters", 3.0)

    if DietDay.objects.filter(week=week, day_number=day_number).exists():
        raise ValidationError(f"Day {day_number} already exists in Week {week.week_number}.")

    day = DietDay.objects.create(
        week=week, day_number=day_number, title=title,
        is_cheat_day=is_cheat, water_target_liters=water,
    )
    return {"day_id": day.id, "day_number": day.day_number, "title": day.title, "is_cheat_day": day.is_cheat_day}


def delete_day(trainer_user, day_id):
    """Deletes a diet day and all its meals."""
    day = get_object_or_404(DietDay, id=day_id, week__plan__trainer=trainer_user, week__plan__is_active=True)
    day.delete()


def add_meal(trainer_user, day_id, data):
    """Adds a meal to a specific diet day."""
    day = get_object_or_404(DietDay, id=day_id, week__plan__trainer=trainer_user, week__plan__is_active=True)
    order = data.get("order") or (day.meals.count() + 1)

    meal = DietMeal.objects.create(
        day=day,
        meal_type=data.get("meal_type", DietMeal.MealType.BREAKFAST),
        order=order,
        calories=data.get("calories", 450),
        protein_g=data.get("protein_g", 30),
        carbs_g=data.get("carbs_g", 50),
        fats_g=data.get("fats_g", 15),
        items_description=data.get("items_description", ""),
        notes=data.get("notes", ""),
        recipe_url=data.get("recipe_url", ""),
    )
    return {"meal_id": meal.id, "meal_type": meal.meal_type, "calories": meal.calories}


def update_meal(trainer_user, meal_id, data):
    """Updates meal fields."""
    meal = get_object_or_404(DietMeal, id=meal_id, day__week__plan__trainer=trainer_user, day__week__plan__is_active=True)
    for field in ["meal_type", "order", "calories", "protein_g", "carbs_g", "fats_g", "items_description", "notes", "recipe_url"]:
        if field in data:
            setattr(meal, field, data[field])
    meal.save()
    return {"meal_id": meal.id, "meal_type": meal.meal_type, "calories": meal.calories}


def delete_meal(trainer_user, meal_id):
    """Deletes a meal from a day."""
    meal = get_object_or_404(DietMeal, id=meal_id, day__week__plan__trainer=trainer_user, day__week__plan__is_active=True)
    meal.delete()


# ── Trainer: Assign Plan to Client ───────────────────────────────────────────

def assign_plan_to_client(trainer_user, plan_id, trainer_assignment_id):
    """
    Assigns a diet plan to an active client assigned to this trainer.
    Deactivates any previous diet assignment for that client.
    """
    plan = get_object_or_404(DietPlan, id=plan_id, trainer=trainer_user, is_active=True)
    ta   = get_object_or_404(TrainerAssignment, id=trainer_assignment_id, trainer=trainer_user, is_active=True)

    # Deactivate any previous active diet assignment for this client
    DietAssignment.objects.filter(trainer_assignment=ta, is_active=True).update(is_active=False)

    assignment = DietAssignment.objects.create(
        plan=plan,
        trainer_assignment=ta,
        assigned_by=trainer_user,
        is_active=True,
    )
    return {"assignment_id": assignment.id, "plan_title": plan.title}


def get_trainer_assignments(trainer_user):
    """Returns all diet assignments made by this trainer."""
    assignments = DietAssignment.objects.filter(
        trainer_assignment__trainer=trainer_user,
        is_active=True,
    ).select_related("plan", "trainer_assignment__client", "trainer_assignment__client__client_profile")
    return DietAssignmentListSerializer(assignments, many=True).data


# ── Client: View & Track Diet ────────────────────────────────────────────────

def get_client_current_diet(client_user):
    """
    Returns the client's current active diet assignment with full
    plan structure and meal progress state.
    Endpoint: GET /api/diets/client/current/
    """
    ta = TrainerAssignment.objects.filter(client=client_user, is_active=True).first()
    if not ta:
        return None

    assignment = DietAssignment.objects.filter(
        trainer_assignment=ta, is_active=True
    ).select_related("plan").prefetch_related(
        "plan__weeks__days__meals",
        "progress_records",
    ).order_by("-assigned_at").first()

    if not assignment:
        return None

    return ClientDietCurrentSerializer(assignment).data


def complete_diet_meal(client_user, meal_id, notes=""):
    """
    Marks a diet meal as complete for the client.
    Validates that the meal belongs to the client's active diet assignment.
    unique_together on (assignment, meal) prevents duplicates.
    """
    ta = get_object_or_404(TrainerAssignment, client=client_user, is_active=True)
    assignment = get_object_or_404(DietAssignment, trainer_assignment=ta, is_active=True)
    meal = get_object_or_404(DietMeal, id=meal_id, day__week__plan=assignment.plan)

    completion, created = DietProgress.objects.get_or_create(
        assignment=assignment,
        meal=meal,
        defaults={"notes": notes},
    )
    if not created:
        raise ValidationError("This meal has already been marked as complete.")

    return {
        "completed_meal_id": meal.id,
        "meal_type": meal.get_meal_type_display(),
        "message": f"{meal.get_meal_type_display()} marked complete! 🥗",
    }


def get_client_progress(client_user):
    """
    Returns overall progress stats: completed meals, total meals, %, progress_text.
    """
    ta = TrainerAssignment.objects.filter(client=client_user, is_active=True).first()
    if not ta:
        return {"progress_pct": 0, "progress_text": "0 / 0", "completed_meals": 0, "total_meals": 0}

    assignment = DietAssignment.objects.filter(
        trainer_assignment=ta, is_active=True
    ).first()

    if not assignment:
        return {"progress_pct": 0, "progress_text": "0 / 0", "completed_meals": 0, "total_meals": 0}

    total     = DietMeal.objects.filter(day__week__plan=assignment.plan).count()
    completed = assignment.progress_records.count()
    pct       = round((completed / total) * 100) if total > 0 else 0

    return {
        "progress_pct": pct,
        "progress_text": f"{completed} / {total}",
        "completed_meals": completed,
        "total_meals": total,
        "plan_title": assignment.plan.title,
        "calories": assignment.plan.calories,
    }
