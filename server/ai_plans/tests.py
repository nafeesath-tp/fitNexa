import json
from unittest.mock import patch, MagicMock
from datetime import timedelta

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from subscriptions.models import SubscriptionPlan, ClientSubscription
from client.models import ClientProfile
from accounts.models import TrainerProfile, Specialization
from client_management.models import TrainerAssignment
from workout_plans.models import WorkoutPlan, WorkoutAssignment
from diet_plans.models import DietPlan, DietAssignment
from .models import AIPlanRequest
from .tasks import generate_ai_plan_task, recover_abandoned_ai_plan_request, is_task_actively_running

User = get_user_model()

MOCK_GEMINI_RESPONSE = json.dumps({
    "workout_plan": {
        "title": "Full Body Routine",
        "description": "Personalized weekly strength plan",
        "difficulty": "BEGINNER",
        "days": [
            {
                "day_number": 1,
                "title": "Full Body A",
                "is_rest_day": False,
                "exercises": [
                    {
                        "exercise_name": "Bodyweight Squats",
                        "sets": 3,
                        "reps": "12",
                        "rest_seconds": 60,
                        "notes": "Keep chest up and knees tracking over toes."
                    }
                ]
            },
            {
                "day_number": 2,
                "title": "Rest Day",
                "is_rest_day": True,
                "exercises": []
            }
        ]
    },
    "diet_plan": {
        "title": "Balanced Nutrition Plan",
        "description": "High protein calorie-controlled plan",
        "goal": "GENERAL",
        "calorie_target": 2000,
        "days": [
            {
                "day_number": 1,
                "title": "Day 1 Meals",
                "water_target_liters": 3.0,
                "meals": [
                    {
                        "meal_type": "BREAKFAST",
                        "order": 1,
                        "calories": 500,
                        "protein_g": 35,
                        "carbs_g": 50,
                        "fats_g": 15,
                        "items_description": "Oatmeal with protein shake and blueberries",
                        "notes": "Drink 500ml water before eating"
                    }
                ]
            }
        ]
    }
})


class AIPlansCeleryWorkflowTestCase(TestCase):
    """
    Comprehensive test suite for Celery background processing of AI Plans,
    covering deduplication, crash recovery, atomic rollback, 7-day validation,
    and terminal status protection.
    """

    def setUp(self):
        self.api_client = APIClient()

        # Create Client
        self.client_user = User.objects.create_user(
            email="client@fitnexa.test",
            password="testpassword123",
            role="CLIENT",
            is_verified=True,
            is_active=True,
        )
        self.client_profile = ClientProfile.objects.create(
            user=self.client_user,
            first_name="Jane",
            last_name="Doe",
            is_profile_completed=True,
            fitness_goal="WEIGHT_LOSS",
            experience_level="BEGINNER",
            height_cm=165,
            weight_kg=65,
        )

        # Create Trainer Specialization
        self.specialization, _ = Specialization.objects.get_or_create(
            name="Strength & Conditioning",
            defaults={"description": "Strength training"}
        )

        # Create Trainer
        self.trainer_user = User.objects.create_user(
            email="trainer@fitnexa.test",
            password="testpassword123",
            role="TRAINER",
            is_verified=True,
            is_active=True,
        )
        self.trainer_profile = TrainerProfile.objects.create(
            user=self.trainer_user,
            first_name="John",
            last_name="Coach",
            phone="1234567890",
            bio="Certified coach",
            experience=5,
            specialization=self.specialization,
            approval_status="APPROVED",
        )

        # Assign Trainer to Client
        self.assignment = TrainerAssignment.objects.create(
            client=self.client_user,
            trainer=self.trainer_user,
            is_active=True,
        )

        # Create Premium Subscription for Client
        self.premium_plan, _ = SubscriptionPlan.objects.get_or_create(
            name="PREMIUM",
            defaults={"price_monthly": 49.99, "price_yearly": 499.99}
        )
        self.subscription = ClientSubscription.objects.create(
            client=self.client_user,
            plan=self.premium_plan,
            payment_status=ClientSubscription.PaymentStatus.ACTIVE,
            billing_cycle="MONTHLY",
            expires_at=timezone.now() + timedelta(days=30),
        )

        self.valid_questionnaire = {
            "workout_days_per_week": 4,
            "session_duration_minutes": 45,
            "workout_location": "GYM",
            "equipment": ["Dumbbells", "Barbell"],
            "physical_limitations": "None",
            "sleep_hours": 8,
            "stress_level": 2,
            "meals_per_day": 3,
            "water_target_liters": 3.0,
            "food_dislikes_allergies": "None",
        }

    # 1. API creates PENDING request and queues Celery task returning 202
    @patch("ai_plans.views.generate_ai_plan_task.delay")
    def test_client_generate_plan_queues_celery_task_and_returns_202(self, mock_celery_delay):
        self.api_client.force_authenticate(user=self.client_user)

        with self.captureOnCommitCallbacks(execute=True):
            response = self.api_client.post(
                "/api/ai-plans/generate/",
                data=self.valid_questionnaire,
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertTrue(response.data["success"])
        self.assertIn("request_id", response.data)
        self.assertEqual(response.data["status"], "PENDING")

        req = AIPlanRequest.objects.get(id=response.data["request_id"])
        self.assertEqual(req.status, AIPlanRequest.Status.PENDING)
        self.assertEqual(req.client, self.client_user)
        self.assertEqual(req.trainer, self.trainer_user)
        self.assertEqual(req.week_number, 1)

        mock_celery_delay.assert_called_once_with(req.id)

    # 2. Celery worker executes task: PENDING -> GENERATING -> GENERATED with saved plans
    @patch("ai_plans.services._call_gemini", return_value=MOCK_GEMINI_RESPONSE)
    def test_generate_ai_plan_task_execution(self, mock_gemini):
        ai_request = AIPlanRequest.objects.create(
            client=self.client_user,
            trainer=self.trainer_user,
            week_number=1,
            questionnaire=self.valid_questionnaire,
            status=AIPlanRequest.Status.PENDING,
        )

        result = generate_ai_plan_task(ai_request.id)

        self.assertTrue(result["success"])
        self.assertEqual(result["status"], AIPlanRequest.Status.GENERATED)

        ai_request.refresh_from_db()
        self.assertEqual(ai_request.status, AIPlanRequest.Status.GENERATED)
        self.assertIsNotNone(ai_request.workout_plan)
        self.assertIsNotNone(ai_request.diet_plan)

        wp = ai_request.workout_plan
        self.assertEqual(wp.weeks.count(), 1)
        first_week = wp.weeks.first()
        self.assertEqual(first_week.days.count(), 2)

        dp = ai_request.diet_plan
        self.assertEqual(dp.weeks.count(), 1)
        first_diet_week = dp.weeks.first()
        self.assertEqual(first_diet_week.days.count(), 1)
        self.assertEqual(first_diet_week.days.first().meals.count(), 1)

    # 3. Duplicate task execution prevention if already GENERATED
    @patch("ai_plans.services._call_gemini")
    def test_task_prevents_duplicate_execution_if_already_generated(self, mock_gemini):
        ai_request = AIPlanRequest.objects.create(
            client=self.client_user,
            trainer=self.trainer_user,
            week_number=1,
            questionnaire=self.valid_questionnaire,
            status=AIPlanRequest.Status.GENERATED,
        )

        result = generate_ai_plan_task(ai_request.id)

        mock_gemini.assert_not_called()
        self.assertTrue(result["success"])
        self.assertEqual(result["status"], AIPlanRequest.Status.GENERATED)

    # 4. Failure handling: updates status to GENERATION_FAILED and records error
    @patch("ai_plans.services._call_gemini", side_effect=Exception("Gemini quota exceeded"))
    def test_task_failure_updates_status_to_generation_failed(self, mock_gemini):
        ai_request = AIPlanRequest.objects.create(
            client=self.client_user,
            trainer=self.trainer_user,
            week_number=1,
            questionnaire=self.valid_questionnaire,
            status=AIPlanRequest.Status.PENDING,
        )

        result = generate_ai_plan_task(ai_request.id)

        self.assertFalse(result["success"])
        self.assertEqual(result["status"], AIPlanRequest.Status.GENERATION_FAILED)

        ai_request.refresh_from_db()
        self.assertEqual(ai_request.status, AIPlanRequest.Status.GENERATION_FAILED)
        self.assertIn("Gemini quota exceeded", ai_request.error_message)

    # 5. Trainer approves plan: status becomes ASSIGNED and creates active assignments
    @patch("ai_plans.services._call_gemini", return_value=MOCK_GEMINI_RESPONSE)
    def test_trainer_approve_and_assign_plan(self, mock_gemini):
        ai_request = AIPlanRequest.objects.create(
            client=self.client_user,
            trainer=self.trainer_user,
            week_number=1,
            questionnaire=self.valid_questionnaire,
            status=AIPlanRequest.Status.PENDING,
        )
        generate_ai_plan_task(ai_request.id)
        ai_request.refresh_from_db()

        self.api_client.force_authenticate(user=self.trainer_user)
        response = self.api_client.post(f"/api/ai-plans/trainer/{ai_request.id}/approve/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])

        ai_request.refresh_from_db()
        self.assertEqual(ai_request.status, AIPlanRequest.Status.ASSIGNED)

        self.assertTrue(WorkoutAssignment.objects.filter(plan=ai_request.workout_plan, is_active=True).exists())
        self.assertTrue(DietAssignment.objects.filter(plan=ai_request.diet_plan, is_active=True).exists())

    # 6. Trainer rejects plan and requests regeneration via Celery
    @patch("ai_plans.views.generate_ai_plan_task.delay")
    def test_trainer_reject_and_regenerate_queues_celery_task(self, mock_celery_delay):
        old_request = AIPlanRequest.objects.create(
            client=self.client_user,
            trainer=self.trainer_user,
            week_number=1,
            questionnaire=self.valid_questionnaire,
            status=AIPlanRequest.Status.GENERATED,
        )

        self.api_client.force_authenticate(user=self.trainer_user)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.api_client.post(f"/api/ai-plans/trainer/{old_request.id}/regenerate/")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertTrue(response.data["success"])
        new_req_id = response.data["request_id"]

        old_request.refresh_from_db()
        self.assertEqual(old_request.status, AIPlanRequest.Status.GENERATION_FAILED)
        self.assertEqual(old_request.error_message, "Trainer requested regeneration.")

        new_request = AIPlanRequest.objects.get(id=new_req_id)
        self.assertEqual(new_request.week_number, 1)
        self.assertEqual(new_request.status, AIPlanRequest.Status.PENDING)

        mock_celery_delay.assert_called_once_with(new_request.id)

    # 7. Trainer generates next week adaptive plan via Celery
    @patch("ai_plans.views.generate_ai_plan_task.delay")
    def test_trainer_generate_next_week_queues_celery_task(self, mock_celery_delay):
        week1_request = AIPlanRequest.objects.create(
            client=self.client_user,
            trainer=self.trainer_user,
            week_number=1,
            questionnaire=self.valid_questionnaire,
            status=AIPlanRequest.Status.ASSIGNED,
        )

        self.api_client.force_authenticate(user=self.trainer_user)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.api_client.post(
                f"/api/ai-plans/trainer/{week1_request.id}/next-week/",
                data={"client_feedback": "Feeling stronger, ready for more challenges."},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertTrue(response.data["success"])
        next_req_id = response.data["request_id"]

        next_request = AIPlanRequest.objects.get(id=next_req_id)
        self.assertEqual(next_request.week_number, 2)
        self.assertEqual(next_request.status, AIPlanRequest.Status.PENDING)
        self.assertIn("client_feedback", next_request.previous_progress)

        mock_celery_delay.assert_called_once_with(next_request.id)

    # 8. Duplicate task execution prevention for GENERATING status
    @patch("ai_plans.services._call_gemini")
    def test_task_prevents_duplicate_execution_if_already_generating(self, mock_gemini):
        ai_request = AIPlanRequest.objects.create(
            client=self.client_user,
            trainer=self.trainer_user,
            week_number=1,
            questionnaire=self.valid_questionnaire,
            status=AIPlanRequest.Status.GENERATING,
        )

        result = generate_ai_plan_task(ai_request.id)

        mock_gemini.assert_not_called()
        self.assertFalse(result["success"])
        self.assertIn("active worker", result["error"])

    # 9. Saving failure atomic rollback prevents orphaned plans
    @patch("ai_plans.services.parse_and_save_diet", side_effect=Exception("Diet parsing failed"))
    @patch("ai_plans.services._call_gemini", return_value=MOCK_GEMINI_RESPONSE)
    def test_plan_saving_atomic_rollback_prevents_orphaned_records(self, mock_gemini, mock_diet):
        initial_workout_count = WorkoutPlan.objects.count()
        initial_diet_count = DietPlan.objects.count()

        ai_request = AIPlanRequest.objects.create(
            client=self.client_user,
            trainer=self.trainer_user,
            week_number=1,
            questionnaire=self.valid_questionnaire,
            status=AIPlanRequest.Status.PENDING,
        )

        result = generate_ai_plan_task(ai_request.id)

        self.assertFalse(result["success"])
        self.assertEqual(result["status"], AIPlanRequest.Status.GENERATION_FAILED)

        self.assertEqual(WorkoutPlan.objects.count(), initial_workout_count)
        self.assertEqual(DietPlan.objects.count(), initial_diet_count)

        ai_request.refresh_from_db()
        self.assertEqual(ai_request.status, AIPlanRequest.Status.GENERATION_FAILED)
        self.assertIn("Diet parsing failed", ai_request.error_message)

    # 10. Test generation with exactly seven workout days and seven diet days
    @patch("ai_plans.services._call_gemini")
    def test_generate_ai_plan_seven_workout_and_diet_days(self, mock_gemini):
        workout_days = []
        for d in range(1, 8):
            is_rest = d in [3, 5, 7]
            exercises = [] if is_rest else [
                {
                    "exercise_name": f"Day {d} Exercise 1",
                    "sets": 3,
                    "reps": "10-12",
                    "rest_seconds": 60,
                    "notes": f"Proper form for day {d}",
                }
            ]
            workout_days.append({
                "day_number": d,
                "title": f"Day {d} - {'Rest & Recovery' if is_rest else 'Training'}",
                "is_rest_day": is_rest,
                "exercises": exercises,
            })

        diet_days = []
        for d in range(1, 8):
            diet_days.append({
                "day_number": d,
                "title": f"Day {d} Nutrition",
                "water_target_liters": 3.0,
                "meals": [
                    {
                        "meal_type": "BREAKFAST",
                        "order": 1,
                        "calories": 450,
                        "protein_g": 30,
                        "carbs_g": 45,
                        "fats_g": 12,
                        "items_description": f"Day {d} breakfast",
                        "notes": "Healthy morning meal",
                    },
                    {
                        "meal_type": "LUNCH",
                        "order": 2,
                        "calories": 650,
                        "protein_g": 45,
                        "carbs_g": 60,
                        "fats_g": 18,
                        "items_description": f"Day {d} lunch",
                        "notes": "Balanced lunch",
                    },
                    {
                        "meal_type": "DINNER",
                        "order": 3,
                        "calories": 550,
                        "protein_g": 40,
                        "carbs_g": 40,
                        "fats_g": 15,
                        "items_description": f"Day {d} dinner",
                        "notes": "Lean dinner",
                    },
                ],
            })

        mock_gemini.return_value = json.dumps({
            "workout_plan": {
                "title": "7-Day AI Workout Routine",
                "description": "Full week progressive split",
                "difficulty": "BEGINNER",
                "days": workout_days,
            },
            "diet_plan": {
                "title": "7-Day AI Diet Plan",
                "description": "Full week nutritional schedule",
                "goal": "GENERAL",
                "calorie_target": 1800,
                "days": diet_days,
            },
        })

        ai_request = AIPlanRequest.objects.create(
            client=self.client_user,
            trainer=self.trainer_user,
            week_number=1,
            questionnaire=self.valid_questionnaire,
            status=AIPlanRequest.Status.PENDING,
        )

        result = generate_ai_plan_task(ai_request.id)

        self.assertTrue(result["success"])
        self.assertEqual(result["status"], AIPlanRequest.Status.GENERATED)

        ai_request.refresh_from_db()
        self.assertEqual(ai_request.status, AIPlanRequest.Status.GENERATED)
        self.assertIsNotNone(ai_request.workout_plan)
        self.assertIsNotNone(ai_request.diet_plan)

        wp_week = ai_request.workout_plan.weeks.first()
        self.assertEqual(wp_week.days.count(), 7)
        saved_workout_day_numbers = list(wp_week.days.values_list("day_number", flat=True).order_by("day_number"))
        self.assertEqual(saved_workout_day_numbers, [1, 2, 3, 4, 5, 6, 7])

        dp_week = ai_request.diet_plan.weeks.first()
        self.assertEqual(dp_week.days.count(), 7)
        saved_diet_day_numbers = list(dp_week.days.values_list("day_number", flat=True).order_by("day_number"))
        self.assertEqual(saved_diet_day_numbers, [1, 2, 3, 4, 5, 6, 7])

        for day in dp_week.days.all():
            self.assertEqual(day.meals.count(), 3)

    # 11. Duplicate task execution does not change ASSIGNED to GENERATED
    @patch("ai_plans.services._call_gemini")
    def test_duplicate_task_execution_preserves_assigned_status(self, mock_gemini):
        wp = WorkoutPlan.objects.create(trainer=self.trainer_user, title="Dummy WP")
        dp = DietPlan.objects.create(trainer=self.trainer_user, title="Dummy DP")

        assigned_request = AIPlanRequest.objects.create(
            client=self.client_user,
            trainer=self.trainer_user,
            week_number=1,
            questionnaire=self.valid_questionnaire,
            workout_plan=wp,
            diet_plan=dp,
            status=AIPlanRequest.Status.ASSIGNED,
        )

        result = generate_ai_plan_task(assigned_request.id)

        mock_gemini.assert_not_called()
        self.assertTrue(result["success"])
        self.assertEqual(result["status"], AIPlanRequest.Status.ASSIGNED)

        assigned_request.refresh_from_db()
        self.assertEqual(assigned_request.status, AIPlanRequest.Status.ASSIGNED)

    # 12. Duplicate execution does not change TRAINER_REVIEWED to GENERATED
    @patch("ai_plans.services._call_gemini")
    def test_duplicate_task_execution_preserves_trainer_reviewed_status(self, mock_gemini):
        wp = WorkoutPlan.objects.create(trainer=self.trainer_user, title="Reviewed WP")
        dp = DietPlan.objects.create(trainer=self.trainer_user, title="Reviewed DP")

        reviewed_request = AIPlanRequest.objects.create(
            client=self.client_user,
            trainer=self.trainer_user,
            week_number=1,
            questionnaire=self.valid_questionnaire,
            workout_plan=wp,
            diet_plan=dp,
            status=AIPlanRequest.Status.TRAINER_REVIEWED,
        )

        result = generate_ai_plan_task(reviewed_request.id)

        mock_gemini.assert_not_called()
        self.assertTrue(result["success"])
        self.assertEqual(result["status"], AIPlanRequest.Status.TRAINER_REVIEWED)

        reviewed_request.refresh_from_db()
        self.assertEqual(reviewed_request.status, AIPlanRequest.Status.TRAINER_REVIEWED)

    # 13. A legitimate active GENERATING request is not incorrectly marked failed
    @patch("ai_plans.services._call_gemini")
    def test_legitimate_active_generating_request_not_marked_failed(self, mock_gemini):
        active_request = AIPlanRequest.objects.create(
            client=self.client_user,
            trainer=self.trainer_user,
            week_number=1,
            questionnaire=self.valid_questionnaire,
            status=AIPlanRequest.Status.GENERATING,
        )

        result = generate_ai_plan_task(active_request.id)

        mock_gemini.assert_not_called()
        self.assertFalse(result["success"])
        self.assertIn("active worker", result["error"])

        active_request.refresh_from_db()
        self.assertEqual(active_request.status, AIPlanRequest.Status.GENERATING)

    # 14. A genuinely abandoned request can be safely recovered or marked failed for manual regeneration
    @patch("ai_plans.tasks.is_task_actively_running", return_value=False)
    def test_genuinely_abandoned_request_safely_marked_for_regeneration(self, mock_is_running):
        abandoned_request = AIPlanRequest.objects.create(
            client=self.client_user,
            trainer=self.trainer_user,
            week_number=1,
            questionnaire=self.valid_questionnaire,
            status=AIPlanRequest.Status.GENERATING,
        )

        recovery_result = recover_abandoned_ai_plan_request(abandoned_request.id, min_age_seconds=0)

        self.assertTrue(recovery_result["recovered"])
        self.assertEqual(recovery_result["status"], AIPlanRequest.Status.GENERATION_FAILED)
        self.assertEqual(recovery_result["action"], "marked_for_regeneration")

        abandoned_request.refresh_from_db()
        self.assertEqual(abandoned_request.status, AIPlanRequest.Status.GENERATION_FAILED)
        self.assertIn("worker terminated unexpectedly", abandoned_request.error_message)

    # 15. Abandoned request with existing plans recovers to GENERATED without calling Gemini
    @patch("ai_plans.services._call_gemini")
    def test_abandoned_request_with_existing_plans_recovers_to_generated(self, mock_gemini):
        wp = WorkoutPlan.objects.create(trainer=self.trainer_user, title="Saved WP")
        dp = DietPlan.objects.create(trainer=self.trainer_user, title="Saved DP")

        partially_done_request = AIPlanRequest.objects.create(
            client=self.client_user,
            trainer=self.trainer_user,
            week_number=1,
            questionnaire=self.valid_questionnaire,
            workout_plan=wp,
            diet_plan=dp,
            status=AIPlanRequest.Status.GENERATING,
        )

        recovery_result = recover_abandoned_ai_plan_request(partially_done_request.id, min_age_seconds=0)

        mock_gemini.assert_not_called()
        self.assertTrue(recovery_result["recovered"])
        self.assertEqual(recovery_result["status"], AIPlanRequest.Status.GENERATED)
        self.assertEqual(recovery_result["action"], "completed_with_existing_plans")

        partially_done_request.refresh_from_db()
        self.assertEqual(partially_done_request.status, AIPlanRequest.Status.GENERATED)

    # 16. Both plans are required before successful completion
    @patch("ai_plans.services._call_gemini")
    def test_both_plans_required_before_successful_completion(self, mock_gemini):
        mock_gemini.return_value = json.dumps({
            "workout_plan": {
                "title": "Solo Workout Plan",
                "difficulty": "BEGINNER",
                "days": []
            }
        })

        ai_request = AIPlanRequest.objects.create(
            client=self.client_user,
            trainer=self.trainer_user,
            week_number=1,
            questionnaire=self.valid_questionnaire,
            status=AIPlanRequest.Status.PENDING,
        )

        result = generate_ai_plan_task(ai_request.id)

        self.assertFalse(result["success"])
        self.assertEqual(result["status"], AIPlanRequest.Status.GENERATION_FAILED)

        ai_request.refresh_from_db()
        self.assertEqual(ai_request.status, AIPlanRequest.Status.GENERATION_FAILED)
        self.assertIn("missing 'diet_plan'", ai_request.error_message)

    # 17. is_task_actively_running normalizes args and kwargs across active, reserved, and scheduled
    @patch("celery.current_app.control.inspect")
    def test_is_task_actively_running_normalizes_args_and_kwargs(self, mock_inspect):
        mock_inspector = MagicMock()
        mock_inspect.return_value = mock_inspector

        # Active pool match
        mock_inspector.active.return_value = {
            "worker1@node": [
                {"name": "ai_plans.tasks.generate_ai_plan_task", "args": [42], "kwargs": {}}
            ]
        }
        mock_inspector.reserved.return_value = {}
        mock_inspector.scheduled.return_value = {}
        self.assertTrue(is_task_actively_running("42"))
        self.assertTrue(is_task_actively_running(42))

        # Reserved pool match
        mock_inspector.active.return_value = {}
        mock_inspector.reserved.return_value = {
            "worker1@node": [
                {"name": "ai_plans.tasks.generate_ai_plan_task", "args": ["105"], "kwargs": {}}
            ]
        }
        self.assertTrue(is_task_actively_running(105))

        # Scheduled pool with actual Celery nested request structure
        mock_inspector.active.return_value = {}
        mock_inspector.reserved.return_value = {}
        mock_inspector.scheduled.return_value = {
            "worker1@node": [
                {
                    "eta": "2026-11-08T18:00:00",
                    "priority": 6,
                    "request": {
                        "id": "celery-uuid-1",
                        "name": "ai_plans.tasks.generate_ai_plan_task",
                        "args": [99],
                        "kwargs": {},
                    },
                }
            ]
        }
        self.assertTrue(is_task_actively_running(99))
        self.assertTrue(is_task_actively_running("99"))

        # Pools respond, but task not present
        mock_inspector.active.return_value = {
            "worker1@node": [{"name": "other_task", "args": [42]}]
        }
        mock_inspector.reserved.return_value = {}
        mock_inspector.scheduled.return_value = {}
        self.assertFalse(is_task_actively_running(42))

        # Full inspection failure (all return None)
        mock_inspector.active.return_value = None
        mock_inspector.reserved.return_value = None
        mock_inspector.scheduled.return_value = None
        self.assertIsNone(is_task_actively_running(42))

    # 18. Scheduled-task inspection: Celery nested request structure detection
    @patch("celery.current_app.control.inspect")
    def test_is_task_actively_running_detects_celery_nested_scheduled_tasks(self, mock_inspect):
        mock_inspector = MagicMock()
        mock_inspect.return_value = mock_inspector

        mock_inspector.active.return_value = {}
        mock_inspector.reserved.return_value = {}
        # Actual Celery scheduled task format where task details are nested under entry["request"]
        mock_inspector.scheduled.return_value = {
            "worker1@node": [
                {
                    "eta": "2026-11-08T18:00:00.000000+00:00",
                    "priority": 6,
                    "request": {
                        "id": "celery-uuid-scheduled-task-1",
                        "name": "ai_plans.tasks.generate_ai_plan_task",
                        "args": [99],
                        "kwargs": {},
                    },
                }
            ]
        }

        # Verify task is detected from nested request structure using both int and str IDs
        self.assertTrue(is_task_actively_running(99))
        self.assertTrue(is_task_actively_running("99"))

        # Verify other task IDs return False when pools respond successfully
        self.assertFalse(is_task_actively_running(100))

    # 19. Partial inspection failures: returns None if any required pool is None
    @patch("celery.current_app.control.inspect")
    def test_partial_inspection_failure_returns_none_when_one_pool_is_none(self, mock_inspect):
        mock_inspector = MagicMock()
        mock_inspect.return_value = mock_inspector

        # Case 1: active() returns None (timed out), reserved & scheduled are valid empty dicts
        mock_inspector.active.return_value = None
        mock_inspector.reserved.return_value = {}
        mock_inspector.scheduled.return_value = {}
        self.assertIsNone(is_task_actively_running(42))

        # Case 2: scheduled() returns None (timed out), active & reserved are valid empty dicts
        mock_inspector.active.return_value = {}
        mock_inspector.reserved.return_value = {}
        mock_inspector.scheduled.return_value = None
        self.assertIsNone(is_task_actively_running(42))

        # Case 3: reserved() returns None, active & scheduled are valid empty dicts
        mock_inspector.active.return_value = {}
        mock_inspector.reserved.return_value = None
        mock_inspector.scheduled.return_value = {}
        self.assertIsNone(is_task_actively_running(42))

    # 20. Partial inspection failure in recovery holds status and does not assume worker crash
    @patch("celery.current_app.control.inspect")
    def test_recovery_held_when_partial_inspection_fails_one_pool_none(self, mock_inspect):
        mock_inspector = MagicMock()
        mock_inspect.return_value = mock_inspector

        # Simulate partial failure: active pool timed out (None), other pools respond
        mock_inspector.active.return_value = None
        mock_inspector.reserved.return_value = {}
        mock_inspector.scheduled.return_value = {}

        old_time = timezone.now() - timedelta(minutes=10)
        ai_request = AIPlanRequest.objects.create(
            client=self.client_user,
            trainer=self.trainer_user,
            week_number=1,
            questionnaire=self.valid_questionnaire,
            status=AIPlanRequest.Status.GENERATING,
        )
        AIPlanRequest.objects.filter(id=ai_request.id).update(updated_at=old_time)

        recovery_result = recover_abandoned_ai_plan_request(ai_request.id, min_age_seconds=60)

        # Must hold status without assuming crash
        self.assertFalse(recovery_result["recovered"])
        self.assertEqual(recovery_result["action"], "inspection_failed_held")
        ai_request.refresh_from_db()
        self.assertEqual(ai_request.status, AIPlanRequest.Status.GENERATING)

    # 21. Worker inspection failure holds status and does not assume crash
    @patch("ai_plans.tasks.is_task_actively_running", return_value=None)
    def test_recovery_when_worker_inspection_fails_holds_status(self, mock_is_running):
        old_time = timezone.now() - timedelta(minutes=10)
        ai_request = AIPlanRequest.objects.create(
            client=self.client_user,
            trainer=self.trainer_user,
            week_number=1,
            questionnaire=self.valid_questionnaire,
            status=AIPlanRequest.Status.GENERATING,
        )
        AIPlanRequest.objects.filter(id=ai_request.id).update(updated_at=old_time)

        recovery_result = recover_abandoned_ai_plan_request(ai_request.id, min_age_seconds=60)

        self.assertFalse(recovery_result["recovered"])
        self.assertEqual(recovery_result["action"], "inspection_failed_held")
        ai_request.refresh_from_db()
        self.assertEqual(ai_request.status, AIPlanRequest.Status.GENERATING)

    # 22. Client my-plans view invokes recovery on abandoned generating request
    @patch("ai_plans.tasks.is_task_actively_running", return_value=False)
    def test_client_my_plans_view_invokes_recovery_on_stale_request(self, mock_is_running):
        old_time = timezone.now() - timedelta(minutes=10)
        stale_request = AIPlanRequest.objects.create(
            client=self.client_user,
            trainer=self.trainer_user,
            week_number=1,
            questionnaire=self.valid_questionnaire,
            status=AIPlanRequest.Status.GENERATING,
        )
        AIPlanRequest.objects.filter(id=stale_request.id).update(updated_at=old_time)

        self.api_client.force_authenticate(user=self.client_user)
        response = self.api_client.get("/api/ai-plans/my-plans/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        stale_request.refresh_from_db()
        self.assertEqual(stale_request.status, AIPlanRequest.Status.GENERATION_FAILED)
