from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from accounts.permissions import IsApprovedTrainer
from client_management.models import TrainerAssignment
from .models import AIPlanRequest
from .serializers import (
    AIPlanRequestCreateSerializer,
    AIPlanRequestListSerializer,
    AIPlanRequestDetailSerializer,
)
from .services import generate_ai_plan, assign_ai_plans_to_client


# ── Helper permission check ───────────────────────────────────────────────────

def _is_premium_client(user):
    from subscriptions.models import ClientSubscription
    from django.utils import timezone
    from django.db.models import Q
    return ClientSubscription.objects.filter(
        client=user,
        payment_status="ACTIVE",
        plan__name="PREMIUM",
    ).filter(Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())).exists()


# ── Client Views ──────────────────────────────────────────────────────────────

class ClientGenerateAIPlanView(APIView):
    """
    POST /api/ai-plans/generate/
    Premium Client submits questionnaire → triggers Gemini generation.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != "CLIENT":
            return Response({"detail": "Only clients can generate AI plans."}, status=403)

        if not _is_premium_client(request.user):
            return Response(
                {"detail": "AI Plan Generation is a Premium feature. Please upgrade your plan."},
                status=403
            )

        # Check if there's already a pending/generating request
        existing = AIPlanRequest.objects.filter(
            client=request.user,
            status__in=[AIPlanRequest.Status.PENDING, AIPlanRequest.Status.GENERATING, AIPlanRequest.Status.GENERATED]
        ).first()
        if existing:
            return Response(
                {
                    "detail": "You already have an AI plan request in progress.",
                    "request_id": existing.id,
                    "status": existing.status,
                },
                status=400,
            )

        serializer = AIPlanRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        questionnaire = serializer.validated_data

        # Determine week number
        last_assigned = AIPlanRequest.objects.filter(
            client=request.user, status=AIPlanRequest.Status.ASSIGNED
        ).order_by("-week_number").first()
        week_number = (last_assigned.week_number + 1) if last_assigned else 1

        # Get assigned trainer
        ta = TrainerAssignment.objects.filter(client=request.user, is_active=True).first()
        trainer = ta.trainer if ta else None

        # Capture previous feedback if provided (for adaptive plans)
        previous_progress = None
        if week_number > 1 and last_assigned and last_assigned.previous_progress:
            previous_progress = last_assigned.previous_progress

        ai_request = AIPlanRequest.objects.create(
            client=request.user,
            trainer=trainer,
            week_number=week_number,
            questionnaire=questionnaire,
            previous_progress=previous_progress,
        )

        # Generate synchronously (for simplicity — can be moved to Celery later)
        try:
            generate_ai_plan(ai_request)
        except Exception as e:
            return Response({"detail": str(e), "request_id": ai_request.id}, status=400)

        return Response(
            {
                "success": True,
                "message": f"Week {week_number} AI plan generated successfully! Your trainer will review it shortly.",
                "request_id": ai_request.id,
                "status": ai_request.status,
            },
            status=201,
        )


class ClientMyAIPlansView(APIView):
    """
    GET /api/ai-plans/my-plans/
    Premium client sees all their AI plan requests and status.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "CLIENT":
            return Response({"detail": "Forbidden."}, status=403)
        requests = AIPlanRequest.objects.filter(client=request.user).order_by("-week_number")
        data = AIPlanRequestListSerializer(requests, many=True).data
        return Response({"success": True, "data": data})


class ClientAIPlanDetailView(APIView):
    """
    GET /api/ai-plans/my-plans/<id>/
    Client views detail of their own AI plan.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            ai_req = AIPlanRequest.objects.get(id=pk, client=request.user)
        except AIPlanRequest.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        return Response({"success": True, "data": AIPlanRequestDetailSerializer(ai_req).data})


# ── Trainer Views ─────────────────────────────────────────────────────────────

class TrainerAIPlanPendingView(APIView):
    """
    GET /api/ai-plans/trainer/pending/
    Trainer sees all AI plans assigned to them, awaiting review.
    """
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def get(self, request):
        requests = AIPlanRequest.objects.filter(
            trainer=request.user,
            status__in=[AIPlanRequest.Status.GENERATED, AIPlanRequest.Status.TRAINER_REVIEWED]
        ).order_by("-created_at")
        data = AIPlanRequestListSerializer(requests, many=True).data
        return Response({"success": True, "data": data})


class TrainerAllAIPlansView(APIView):
    """
    GET /api/ai-plans/trainer/all/
    Trainer sees ALL their AI plans (all statuses).
    """
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def get(self, request):
        requests = AIPlanRequest.objects.filter(trainer=request.user).order_by("-created_at")
        data = AIPlanRequestListSerializer(requests, many=True).data
        return Response({"success": True, "data": data})


class TrainerAIPlanDetailView(APIView):
    """
    GET  /api/ai-plans/trainer/<id>/
    Trainer views full AI plan detail (nested workout + diet).
    """
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def get(self, request, pk):
        try:
            ai_req = AIPlanRequest.objects.get(id=pk, trainer=request.user)
        except AIPlanRequest.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        return Response({"success": True, "data": AIPlanRequestDetailSerializer(ai_req).data})


class TrainerApproveAIPlanView(APIView):
    """
    POST /api/ai-plans/trainer/<id>/approve/
    Trainer approves the AI plan → assigns workout + diet to the client.
    """
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def post(self, request, pk):
        try:
            ai_req = AIPlanRequest.objects.get(id=pk, trainer=request.user)
        except AIPlanRequest.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        if ai_req.status not in [AIPlanRequest.Status.GENERATED, AIPlanRequest.Status.TRAINER_REVIEWED]:
            return Response({"detail": f"Cannot approve a plan in '{ai_req.status}' status."}, status=400)

        try:
            assign_ai_plans_to_client(ai_req)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

        return Response({
            "success": True,
            "message": f"AI plans approved and assigned to {ai_req.client.email}!"
        })


class TrainerRejectAIPlanView(APIView):
    """
    POST /api/ai-plans/trainer/<id>/regenerate/
    Trainer rejects and asks for a new AI plan generation for the same week.
    """
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def post(self, request, pk):
        try:
            ai_req = AIPlanRequest.objects.get(id=pk, trainer=request.user)
        except AIPlanRequest.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        # Create a new request for the same week (regenerate)
        new_req = AIPlanRequest.objects.create(
            client=ai_req.client,
            trainer=ai_req.trainer,
            week_number=ai_req.week_number,
            questionnaire=ai_req.questionnaire,
            previous_progress=ai_req.previous_progress,
        )

        # Mark old as failed
        ai_req.status = AIPlanRequest.Status.GENERATION_FAILED
        ai_req.error_message = "Trainer requested regeneration."
        ai_req.save(update_fields=["status", "error_message"])

        try:
            generate_ai_plan(new_req)
        except Exception as e:
            return Response({"detail": str(e), "request_id": new_req.id}, status=400)

        return Response({
            "success": True,
            "message": "New AI plan generated for trainer review.",
            "request_id": new_req.id,
        })


class TrainerGenerateNextWeekView(APIView):
    """
    POST /api/ai-plans/trainer/<id>/next-week/
    Manual trigger: Trainer clicks "Generate Next Week" after client completes week N.
    """
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def post(self, request, pk):
        try:
            current_req = AIPlanRequest.objects.get(
                id=pk, trainer=request.user, status=AIPlanRequest.Status.ASSIGNED
            )
        except AIPlanRequest.DoesNotExist:
            return Response({"detail": "Only ASSIGNED plans can generate the next week."}, status=404)

        # Check not already generated for next week
        existing_next = AIPlanRequest.objects.filter(
            client=current_req.client,
            week_number=current_req.week_number + 1,
        ).first()
        if existing_next:
            return Response({
                "detail": f"Week {current_req.week_number + 1} already exists.",
                "request_id": existing_next.id,
            }, status=400)

        from .services import build_progress_context
        progress = build_progress_context(current_req)

        # Merge client feedback from request body if provided
        client_feedback = request.data.get("client_feedback", "")
        if progress and client_feedback:
            progress["client_feedback"] = client_feedback

        new_req = AIPlanRequest.objects.create(
            client=current_req.client,
            trainer=current_req.trainer,
            week_number=current_req.week_number + 1,
            questionnaire=current_req.questionnaire,  # reuse original preferences
            previous_progress=progress,
        )

        try:
            generate_ai_plan(new_req)
        except Exception as e:
            return Response({"detail": str(e), "request_id": new_req.id}, status=400)

        return Response({
            "success": True,
            "message": f"Week {new_req.week_number} AI plan generated! Please review and approve.",
            "request_id": new_req.id,
            "status": new_req.status,
        })
