from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsTrainer, IsClient, IsApprovedTrainer

from .services import (
    get_trainer_plans, create_workout_plan, get_plan_detail,
    update_workout_plan, delete_workout_plan,
    add_week, add_day, add_exercise, delete_exercise,
    assign_plan_to_client, get_trainer_assignments,
    get_client_current_workout, complete_workout_day, get_client_progress,
    assign_workout_to_group,
)


# ── Trainer: Plan Template List & Create ─────────────────────────────────────

class TrainerWorkoutPlanListCreateAPIView(APIView):
    """
    GET  /api/workouts/trainer/plans/   — list all my templates
    POST /api/workouts/trainer/plans/   — create a new template
    """
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def get(self, request):
        data = get_trainer_plans(request.user)
        return Response({"success": True, "data": data})

    def post(self, request):
        data = create_workout_plan(request.user, request.data)
        return Response({"success": True, "data": data}, status=status.HTTP_201_CREATED)


# ── Trainer: Plan Detail, Update, Delete ─────────────────────────────────────

class TrainerWorkoutPlanDetailAPIView(APIView):
    """
    GET    /api/workouts/trainer/plans/<id>/  — full nested structure
    PATCH  /api/workouts/trainer/plans/<id>/  — update metadata
    DELETE /api/workouts/trainer/plans/<id>/  — soft-delete
    """
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def get(self, request, plan_id):
        data = get_plan_detail(request.user, plan_id)
        return Response({"success": True, "data": data})

    def patch(self, request, plan_id):
        data = update_workout_plan(request.user, plan_id, request.data, partial=True)
        return Response({"success": True, "data": data})

    def delete(self, request, plan_id):
        delete_workout_plan(request.user, plan_id)
        return Response({"success": True, "message": "Workout plan deactivated."}, status=status.HTTP_200_OK)


# ── Trainer: Add Week ─────────────────────────────────────────────────────────

class TrainerAddWeekAPIView(APIView):
    """POST /api/workouts/trainer/plans/<plan_id>/weeks/"""
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def post(self, request, plan_id):
        data = add_week(request.user, plan_id, request.data)
        return Response({"success": True, "data": data}, status=status.HTTP_201_CREATED)


# ── Trainer: Add Day ──────────────────────────────────────────────────────────

class TrainerAddDayAPIView(APIView):
    """POST /api/workouts/trainer/plans/<plan_id>/weeks/<week_id>/days/"""
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def post(self, request, plan_id, week_id):
        data = add_day(request.user, plan_id, week_id, request.data)
        return Response({"success": True, "data": data}, status=status.HTTP_201_CREATED)


# ── Trainer: Add Exercise ─────────────────────────────────────────────────────

class TrainerAddExerciseAPIView(APIView):
    """POST /api/workouts/trainer/plans/<plan_id>/days/<day_id>/exercises/"""
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def post(self, request, plan_id, day_id):
        data = add_exercise(request.user, plan_id, day_id, request.data)
        return Response({"success": True, "data": data}, status=status.HTTP_201_CREATED)


class TrainerDeleteExerciseAPIView(APIView):
    """DELETE /api/workouts/trainer/plans/<plan_id>/exercises/<exercise_id>/"""
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def delete(self, request, plan_id, exercise_id):
        delete_exercise(request.user, plan_id, exercise_id)
        return Response({"success": True, "message": "Exercise removed."})


# ── Trainer: Assign Plan to Client ───────────────────────────────────────────

class TrainerAssignPlanAPIView(APIView):
    """
    POST /api/workouts/trainer/plans/<plan_id>/assign/
    Body: { "trainer_assignment_id": 12 }
    """
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def post(self, request, plan_id):
        ta_id = request.data.get("trainer_assignment_id")
        if not ta_id:
            return Response({"success": False, "message": "trainer_assignment_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        data = assign_plan_to_client(request.user, plan_id, ta_id)
        return Response({"success": True, "data": data}, status=status.HTTP_201_CREATED)


class TrainerWorkoutAssignmentListAPIView(APIView):
    """GET /api/workouts/trainer/assignments/ — see all clients with assigned plans"""
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def get(self, request):
        data = get_trainer_assignments(request.user)
        return Response({"success": True, "data": data})


# ── Client: View & Track Workout ─────────────────────────────────────────────

class ClientCurrentWorkoutAPIView(APIView):
    """
    GET /api/workouts/client/current/
    Returns the client's active assigned workout plan with full day structure and progress.
    """
    permission_classes = [IsAuthenticated, IsClient]

    def get(self, request):
        data = get_client_current_workout(request.user)
        return Response({"success": True, "data": data})


class ClientCompleteDayAPIView(APIView):
    """
    POST /api/workouts/client/complete-day/<day_id>/
    Body (optional): { "notes": "Felt great today!" }
    """
    permission_classes = [IsAuthenticated, IsClient]

    def post(self, request, day_id):
        notes = request.data.get("notes", "")
        data = complete_workout_day(request.user, day_id, notes)
        return Response({"success": True, "data": data}, status=status.HTTP_201_CREATED)


class ClientWorkoutProgressAPIView(APIView):
    """
    GET /api/workouts/client/progress/
    Returns high-level progress stats: completed / total days, %.
    """
    permission_classes = [IsAuthenticated, IsClient]

    def get(self, request):
        data = get_client_progress(request.user)
        return Response({"success": True, "data": data})
