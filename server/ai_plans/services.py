"""
ai_plans/services.py

Core logic:
  1. build_client_context()    – gathers all profile data for the AI prompt
  2. generate_ai_plan()        – calls Gemini, parses response, saves plans
  3. parse_and_save_workout()  – converts AI JSON → WorkoutPlan/Week/Day/Exercise
  4. parse_and_save_diet()     – converts AI JSON → DietPlan/Week/Day/Meal
  5. build_progress_context()  – gathers week N-1 completion data for adaptive plans
"""

import json
import logging
from datetime import date

try:
    from google import genai as google_genai
except ImportError:
    google_genai = None  # Will raise a clear error when actually used

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from client_management.models import TrainerAssignment
from workout_plans.models import WorkoutPlan, WorkoutWeek, WorkoutDay, WorkoutExercise, WorkoutAssignment
from diet_plans.models import DietPlan, DietWeek, DietDay, DietMeal, DietAssignment

logger = logging.getLogger(__name__)


# ── Gemini setup ─────────────────────────────────────────────────────────────

def _call_gemini(prompt):
    """Calls Gemini API using the new google.genai SDK."""
    api_key = getattr(settings, "GEMINI_API_KEY", None)
    if not api_key:
        raise ValidationError("GEMINI_API_KEY is not configured in settings.")
    client = google_genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-3.8-flash",
        contents=prompt,
    )
    return response.text


# ── Context builders ─────────────────────────────────────────────────────────

def build_client_context(client_user):
    """Gathers full client profile to be sent to Gemini as context."""
    profile = getattr(client_user, "client_profile", None)
    if not profile:
        return {}

    age = None
    if profile.date_of_birth:
        today = date.today()
        dob = profile.date_of_birth
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

    bmi = None
    if profile.height_cm and profile.weight_kg and float(profile.height_cm) > 0:
        h_m = float(profile.height_cm) / 100.0
        bmi = round(float(profile.weight_kg) / (h_m * h_m), 1)

    return {
        "age": age,
        "gender": profile.gender or "Not specified",
        "height_cm": float(profile.height_cm) if profile.height_cm else None,
        "weight_kg": float(profile.weight_kg) if profile.weight_kg else None,
        "target_weight_kg": float(profile.target_weight_kg) if profile.target_weight_kg else None,
        "bmi": bmi,
        "fitness_goal": profile.get_fitness_goal_display() if profile.fitness_goal else "General Health",
        "experience_level": profile.get_experience_level_display() if profile.experience_level else "Beginner",
        "preferred_workout": profile.get_preferred_workout_display() if profile.preferred_workout else "General",
        "diet_preference": profile.get_diet_preference_display() if profile.diet_preference else "None",
        "medical_conditions": profile.medical_condition or "None",
    }


def build_progress_context(previous_request):
    """Builds progress summary from previous week for adaptive re-generation."""
    if not previous_request:
        return None

    progress = {"week_number": previous_request.week_number, "workout": {}, "diet": {}}

    # Workout completion
    if previous_request.workout_plan:
        wp = previous_request.workout_plan
        # Count total non-rest days
        from workout_plans.models import WorkoutDay as WD, WorkoutCompletion
        total_days = WD.objects.filter(week__plan=wp, is_rest_day=False).count()
        # Get most recent assignment for this client
        ta = TrainerAssignment.objects.filter(client=previous_request.client, is_active=True).first()
        if ta:
            wa = WorkoutAssignment.objects.filter(plan=wp, trainer_assignment=ta).first()
            if wa:
                completed = WorkoutCompletion.objects.filter(assignment=wa).count()
                progress["workout"] = {
                    "total_training_days": total_days,
                    "completed_days": completed,
                    "completion_pct": round((completed / total_days * 100) if total_days else 0, 1),
                }

    # Diet adherence
    if previous_request.diet_plan:
        from diet_plans.models import DietMeal as DM, DietProgress
        total_meals = DM.objects.filter(day__week__plan=previous_request.diet_plan).count()
        ta = TrainerAssignment.objects.filter(client=previous_request.client, is_active=True).first()
        if ta:
            da = DietAssignment.objects.filter(plan=previous_request.diet_plan, trainer_assignment=ta).first()
            if da:
                completed_meals = DietProgress.objects.filter(assignment=da).count()
                progress["diet"] = {
                    "total_meals": total_meals,
                    "completed_meals": completed_meals,
                    "adherence_pct": round((completed_meals / total_meals * 100) if total_meals else 0, 1),
                }

    # Client feedback if stored
    if previous_request.previous_progress:
        progress["client_feedback"] = previous_request.previous_progress.get("feedback", "")

    return progress


# ── Prompt builder ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert certified fitness coach and dietitian AI.
You create highly personalized, science-based workout and diet plans.
You MUST return ONLY valid JSON — no markdown, no explanation, no extra text.
The JSON must exactly follow the schema provided."""

JSON_SCHEMA = """
{
  "workout_plan": {
    "title": "string",
    "description": "string",
    "difficulty": "BEGINNER|INTERMEDIATE|ADVANCED",
    "days": [
      {
        "day_number": 1,
        "title": "string (e.g. Chest & Triceps)",
        "is_rest_day": false,
        "exercises": [
          {
            "exercise_name": "string",
            "sets": 3,
            "reps": "10-12",
            "rest_seconds": 60,
            "notes": "string"
          }
        ]
      }
    ]
  },
  "diet_plan": {
    "title": "string",
    "description": "string",
    "goal": "WEIGHT_LOSS|MUSCLE_GAIN|MAINTENANCE|ENDURANCE|GENERAL",
    "calorie_target": 1800,
    "days": [
      {
        "day_number": 1,
        "title": "string",
        "water_target_liters": 3.0,
        "meals": [
          {
            "meal_type": "BREAKFAST|MID_MORNING|LUNCH|EVENING_SNACK|DINNER|PRE_WORKOUT|POST_WORKOUT|OTHER",
            "order": 1,
            "calories": 400,
            "protein_g": 30,
            "carbs_g": 45,
            "fats_g": 10,
            "items_description": "string",
            "notes": "string"
          }
        ]
      }
    ]
  }
}
"""


def _build_prompt(client_context, questionnaire, week_number, progress_context=None):
    """Assembles the complete Gemini prompt."""

    prompt_parts = [
        SYSTEM_PROMPT,
        "\n\n=== CLIENT PROFILE ===\n",
        json.dumps(client_context, indent=2),
        "\n\n=== WORKOUT PREFERENCES ===\n",
        json.dumps(questionnaire, indent=2),
    ]

    if progress_context and week_number > 1:
        prompt_parts.extend([
            f"\n\n=== PREVIOUS WEEK ({week_number - 1}) PERFORMANCE ===\n",
            json.dumps(progress_context, indent=2),
            f"\n\nIMPORTANT: This is Week {week_number} (adaptive plan).",
            "Adjust difficulty, volume and meal portions based on the previous week's performance.",
            "If completion was below 70%, reduce intensity slightly.",
            "If completion was above 90%, increase intensity and volume.",
        ])
    else:
        prompt_parts.append(f"\n\nGenerate a complete Week {week_number} personalized plan.")

    prompt_parts.extend([
        "\n\n=== IMPORTANT RULES ===",
        "- Generate exactly 7 days in each plan (1 to 7).",
        "- Include appropriate rest days for the workout plan.",
        "- Rest days should have is_rest_day: true and an empty exercises array [].",
        "- Ensure meals cover the full day with realistic portion sizes.",
        "- Make exercises achievable given the equipment and location specified.",
        "- Calorie totals per day should closely match the calorie_target.",
        "- CRITICAL: For beginner clients, you MUST include brief step-by-step instructions on how to perform each exercise in the 'notes' field.",
        "\n\n=== REQUIRED JSON SCHEMA ===\n",
        JSON_SCHEMA,
        "\n\nReturn ONLY the JSON. No markdown. No explanation.",
    ])

    return "\n".join(prompt_parts)


# ── Parsers ───────────────────────────────────────────────────────────────────

@transaction.atomic
def parse_and_save_workout(trainer_user, ai_data, week_number):
    """Creates a WorkoutPlan (+ weeks/days/exercises) from Gemini JSON output."""
    wp_data = ai_data.get("workout_plan", {})
    if not wp_data:
        raise ValidationError("AI response missing 'workout_plan' key.")

    difficulty_map = {
        "BEGINNER": WorkoutPlan.DifficultyLevel.BEGINNER,
        "INTERMEDIATE": WorkoutPlan.DifficultyLevel.INTERMEDIATE,
        "ADVANCED": WorkoutPlan.DifficultyLevel.ADVANCED,
    }
    raw_diff = str(wp_data.get("difficulty", "BEGINNER")).upper()
    diff_val = difficulty_map.get(raw_diff, WorkoutPlan.DifficultyLevel.BEGINNER)

    raw_title = wp_data.get("title", f"AI Workout Plan – Week {week_number}")
    plan_title = f"[AI] {raw_title}"[:200]

    plan = WorkoutPlan.objects.create(
        trainer=trainer_user,
        title=plan_title,
        description=wp_data.get("description", ""),
        difficulty=diff_val,
        duration_weeks=1,
        is_active=True,
    )

    # Single week
    week = WorkoutWeek.objects.create(plan=plan, week_number=1, title=f"Week {week_number}"[:100])

    for day_data in wp_data.get("days", []):
        day_num = day_data.get("day_number", 1)
        day = WorkoutDay.objects.create(
            week=week,
            day_number=day_num,
            title=str(day_data.get("title", f"Day {day_num}"))[:150],
            is_rest_day=day_data.get("is_rest_day", False),
        )
        if not day_data.get("is_rest_day", False):
            for order, ex_data in enumerate(day_data.get("exercises", []), start=1):
                WorkoutExercise.objects.create(
                    day=day,
                    exercise_name=str(ex_data.get("exercise_name", "Exercise"))[:200],
                    sets=ex_data.get("sets", 3),
                    reps=str(ex_data.get("reps", "10"))[:100],
                    rest_seconds=ex_data.get("rest_seconds", 60),
                    notes=str(ex_data.get("notes", "")),
                    order=order,
                )

    return plan


@transaction.atomic
def parse_and_save_diet(trainer_user, ai_data, week_number):
    """Creates a DietPlan (+ weeks/days/meals) from Gemini JSON output."""
    dp_data = ai_data.get("diet_plan", {})
    if not dp_data:
        raise ValidationError("AI response missing 'diet_plan' key.")

    goal_map = {
        "WEIGHT_LOSS": DietPlan.GoalType.WEIGHT_LOSS,
        "MUSCLE_GAIN": DietPlan.GoalType.MUSCLE_GAIN,
        "MAINTENANCE": DietPlan.GoalType.MAINTENANCE,
        "ENDURANCE": DietPlan.GoalType.ENDURANCE,
        "GENERAL": DietPlan.GoalType.GENERAL,
    }
    raw_goal = str(dp_data.get("goal", "GENERAL")).upper()
    goal_val = goal_map.get(raw_goal, DietPlan.GoalType.GENERAL)

    raw_diet_title = dp_data.get("title", f"AI Diet Plan – Week {week_number}")
    diet_title = f"[AI] {raw_diet_title}"[:200]

    plan = DietPlan.objects.create(
        trainer=trainer_user,
        title=diet_title,
        description=dp_data.get("description", ""),
        calories=dp_data.get("calorie_target", 1800),
        goal=goal_val,
        duration_weeks=1,
        is_active=True,
    )

    week = DietWeek.objects.create(plan=plan, week_number=1, title=f"Week {week_number}"[:100])

    valid_meal_types = dict(DietMeal.MealType.choices)

    for day_data in dp_data.get("days", []):
        day_num = day_data.get("day_number", 1)
        day = DietDay.objects.create(
            week=week,
            day_number=day_num,
            title=str(day_data.get("title", f"Day {day_num}"))[:100],
            water_target_liters=day_data.get("water_target_liters", 3.0),
        )
        for meal_data in day_data.get("meals", []):
            raw_meal_type = str(meal_data.get("meal_type", "")).upper()
            meal_type = raw_meal_type if raw_meal_type in valid_meal_types else DietMeal.MealType.OTHER

            DietMeal.objects.create(
                day=day,
                meal_type=meal_type,
                order=meal_data.get("order", 1),
                calories=meal_data.get("calories", 400),
                protein_g=meal_data.get("protein_g", 25),
                carbs_g=meal_data.get("carbs_g", 50),
                fats_g=meal_data.get("fats_g", 15),
                items_description=str(meal_data.get("items_description", "")),
                notes=str(meal_data.get("notes", "")),
            )

    return plan


# ── Main generation entry point ───────────────────────────────────────────────

def generate_ai_plan(ai_request):
    """
    Main service function.
    1. Builds prompt
    2. Calls Gemini
    3. Parses and saves workout + diet plans
    4. Updates ai_request status
    """
    from .models import AIPlanRequest

    client = ai_request.client
    trainer = ai_request.trainer

    if not trainer:
        ta = TrainerAssignment.objects.filter(client=client, is_active=True).first()
        if ta:
            trainer = ta.trainer
            ai_request.trainer = trainer
            ai_request.save(update_fields=["trainer"])

    if not trainer:
        ai_request.status = AIPlanRequest.Status.GENERATION_FAILED
        ai_request.error_message = "No trainer is assigned to this client."
        ai_request.save()
        raise ValidationError("No trainer assigned to this client.")

    # Build context
    client_context = build_client_context(client)
    progress_context = build_progress_context(
        AIPlanRequest.objects.filter(
            client=client, week_number=ai_request.week_number - 1, status=AIPlanRequest.Status.ASSIGNED
        ).first()
        if ai_request.week_number > 1 else None
    )

    prompt = _build_prompt(
        client_context,
        ai_request.questionnaire,
        ai_request.week_number,
        progress_context,
    )

    # Save prompt for audit
    ai_request.ai_prompt = prompt
    ai_request.status = AIPlanRequest.Status.GENERATING
    ai_request.save(update_fields=["ai_prompt", "status"])

    try:
        raw_text = _call_gemini(prompt).strip()

        # Strip markdown code fences if Gemini wrapped in them
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]

        ai_request.ai_response_raw = raw_text
        ai_request.save(update_fields=["ai_response_raw"])

        ai_data = json.loads(raw_text)

    except json.JSONDecodeError as e:
        ai_request.status = AIPlanRequest.Status.GENERATION_FAILED
        ai_request.error_message = f"Gemini returned invalid JSON: {str(e)}"
        ai_request.save()
        raise ValidationError("AI returned invalid JSON. Please try again.")
    except Exception as e:
        ai_request.status = AIPlanRequest.Status.GENERATION_FAILED
        ai_request.error_message = str(e)
        ai_request.save()
        logger.exception("Gemini API call failed")
        raise ValidationError(f"AI generation failed: {str(e)}")

    # Parse and save plans atomically so failure in either plan rolls back both,
    # preventing incomplete or orphaned plan records in the database.
    try:
        with transaction.atomic():
            workout_plan = parse_and_save_workout(trainer, ai_data, ai_request.week_number)
            diet_plan    = parse_and_save_diet(trainer, ai_data, ai_request.week_number)

            if not workout_plan or not diet_plan:
                raise ValidationError("Both workout and diet plans must be created.")

            ai_request.workout_plan = workout_plan
            ai_request.diet_plan    = diet_plan
            ai_request.status       = AIPlanRequest.Status.GENERATED
            ai_request.error_message = ""
            ai_request.save(update_fields=["workout_plan", "diet_plan", "status", "error_message"])

    except Exception as e:
        logger.exception(f"Failed to parse and save workout or diet plan for request {ai_request.id}: {e}")
        ai_request.status = AIPlanRequest.Status.GENERATION_FAILED
        ai_request.error_message = str(e)
        ai_request.save(update_fields=["status", "error_message"])
        raise ValidationError(f"Plan creation failed: {str(e)}")

    return ai_request


def assign_ai_plans_to_client(ai_request):
    """
    Called when a trainer approves the AI plans.
    Creates WorkoutAssignment + DietAssignment for the client.
    """
    client = ai_request.client
    ta = TrainerAssignment.objects.filter(client=client, is_active=True, trainer=ai_request.trainer).first()
    if not ta:
        raise ValidationError("Could not find active trainer assignment for this client.")

    # Deactivate existing
    WorkoutAssignment.objects.filter(trainer_assignment=ta, is_active=True).update(is_active=False)
    DietAssignment.objects.filter(trainer_assignment=ta, is_active=True).update(is_active=False)

    # Create new
    WorkoutAssignment.objects.create(plan=ai_request.workout_plan, trainer_assignment=ta, is_active=True)
    DietAssignment.objects.create(
        plan=ai_request.diet_plan,
        trainer_assignment=ta,
        assigned_by=ai_request.trainer,
        is_active=True,
    )

    from .models import AIPlanRequest
    ai_request.status = AIPlanRequest.Status.ASSIGNED
    ai_request.save(update_fields=["status"])

    return ai_request
