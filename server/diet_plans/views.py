from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsTrainer, IsClient, IsApprovedTrainer

from .services import (
    get_trainer_plans, create_diet_plan, get_plan_detail,
    update_diet_plan, delete_diet_plan,
    add_week, delete_week, add_day, delete_day, add_meal, update_meal, delete_meal,
    assign_plan_to_client, get_trainer_assignments,
    get_client_current_diet, complete_diet_meal, get_client_progress,
)


# ── Trainer: Plan Template List & Create ─────────────────────────────────────

class TrainerDietPlanListCreateAPIView(APIView):
    """
    GET  /api/diets/trainer/plans/   — list all my diet templates
    POST /api/diets/trainer/plans/   — create a new diet template
    """
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def get(self, request):
        data = get_trainer_plans(request.user)
        return Response({"success": True, "data": data})

    def post(self, request):
        data = create_diet_plan(request.user, request.data)
        return Response({"success": True, "data": data}, status=status.HTTP_201_CREATED)


# ── Trainer: Plan Detail, Update, Delete ─────────────────────────────────────

class TrainerDietPlanDetailAPIView(APIView):
    """
    GET    /api/diets/trainer/plans/<id>/  — full nested structure
    PATCH  /api/diets/trainer/plans/<id>/  — update metadata
    DELETE /api/diets/trainer/plans/<id>/  — soft-delete
    """
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def get(self, request, plan_id):
        data = get_plan_detail(request.user, plan_id)
        return Response({"success": True, "data": data})

    def patch(self, request, plan_id):
        data = update_diet_plan(request.user, plan_id, request.data, partial=True)
        return Response({"success": True, "data": data})

    def delete(self, request, plan_id):
        delete_diet_plan(request.user, plan_id)
        return Response({"success": True, "message": "Diet plan deactivated."}, status=status.HTTP_200_OK)


# ── Trainer: Week Builder ─────────────────────────────────────────────────────

class TrainerAddWeekAPIView(APIView):
    """POST /api/diets/trainer/plans/<plan_id>/weeks/"""
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def post(self, request, plan_id):
        data = add_week(request.user, plan_id, request.data)
        return Response({"success": True, "data": data}, status=status.HTTP_201_CREATED)


class TrainerDeleteWeekAPIView(APIView):
    """DELETE /api/diets/trainer/plans/<plan_id>/weeks/<week_id>/"""
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def delete(self, request, plan_id, week_id):
        delete_week(request.user, week_id)
        return Response({"success": True, "message": "Week removed."})


# ── Trainer: Day Builder ──────────────────────────────────────────────────────

class TrainerAddDayAPIView(APIView):
    """POST /api/diets/trainer/plans/<plan_id>/weeks/<week_id>/days/"""
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def post(self, request, plan_id, week_id):
        data = add_day(request.user, week_id, request.data)
        return Response({"success": True, "data": data}, status=status.HTTP_201_CREATED)


class TrainerDeleteDayAPIView(APIView):
    """DELETE /api/diets/trainer/plans/<plan_id>/days/<day_id>/"""
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def delete(self, request, plan_id, day_id):
        delete_day(request.user, day_id)
        return Response({"success": True, "message": "Day removed."})


# ── Trainer: Meal Builder ─────────────────────────────────────────────────────

class TrainerAddMealAPIView(APIView):
    """POST /api/diets/trainer/plans/<plan_id>/days/<day_id>/meals/"""
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def post(self, request, plan_id, day_id):
        data = add_meal(request.user, day_id, request.data)
        return Response({"success": True, "data": data}, status=status.HTTP_201_CREATED)


class TrainerMealDetailAPIView(APIView):
    """
    PATCH  /api/diets/trainer/plans/<plan_id>/meals/<meal_id>/
    DELETE /api/diets/trainer/plans/<plan_id>/meals/<meal_id>/
    """
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def patch(self, request, plan_id, meal_id):
        data = update_meal(request.user, meal_id, request.data)
        return Response({"success": True, "data": data})

    def delete(self, request, plan_id, meal_id):
        delete_meal(request.user, meal_id)
        return Response({"success": True, "message": "Meal removed."})


# ── Trainer: Assign Diet Plan to Client ──────────────────────────────────────

class TrainerAssignDietAPIView(APIView):
    """
    POST /api/diets/trainer/plans/<plan_id>/assign/
    Body: { "trainer_assignment_id": 12 }
    """
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def post(self, request, plan_id):
        ta_id = request.data.get("trainer_assignment_id")
        if not ta_id:
            return Response({"success": False, "message": "trainer_assignment_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        data = assign_plan_to_client(request.user, plan_id, ta_id)
        return Response({"success": True, "data": data}, status=status.HTTP_201_CREATED)


class TrainerDietAssignmentListAPIView(APIView):
    """GET /api/diets/trainer/assignments/ — see all clients with assigned diet plans"""
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def get(self, request):
        data = get_trainer_assignments(request.user)
        return Response({"success": True, "data": data})


# ── Client: View & Track Diet ────────────────────────────────────────────────

class ClientCurrentDietAPIView(APIView):
    """
    GET /api/diets/client/current/
    Returns the client's active assigned diet plan with full structure and progress.
    """
    permission_classes = [IsAuthenticated, IsClient]

    def get(self, request):
        data = get_client_current_diet(request.user)
        return Response({"success": True, "data": data})


class ClientCompleteMealAPIView(APIView):
    """
    POST /api/diets/client/complete-meal/<meal_id>/
    Body (optional): { "notes": "Had oatmeal with strawberries" }
    """
    permission_classes = [IsAuthenticated, IsClient]

    def post(self, request, meal_id):
        notes = request.data.get("notes", "")
        data = complete_diet_meal(request.user, meal_id, notes)
        return Response({"success": True, "data": data}, status=status.HTTP_201_CREATED)


class ClientDietProgressAPIView(APIView):
    """
    GET /api/diets/client/progress/
    Returns high-level diet stats: completed / total meals, progress_text, %.
    """
    permission_classes = [IsAuthenticated, IsClient]

    def get(self, request):
        data = get_client_progress(request.user)
        return Response({"success": True, "data": data})
