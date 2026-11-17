import logging
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction

from accounts.permissions import IsApprovedTrainer
from client_management.models import TrainerAssignment
from .models import AIPlanRequest
from .serializers import (
    AIPlanRequestCreateSerializer,
    AIPlanRequestListSerializer,
    AIPlanRequestDetailSerializer,
)
from .services import generate_ai_plan, assign_ai_plans_to_client, build_progress_context
from .tasks import generate_ai_plan_task, recover_abandoned_ai_plan_request

logger = logging.getLogger(__name__)


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
            status__in=[AIPlanRequest.Status.PENDING, AIPlanRequest.Status.GENERATING, AIPlanRequest.Status.GENERATED, AIPlanRequest.Status.TRAINER_REVIEWED]
        ).first()

        # If in GENERATING, check for controlled recovery of abandoned worker
        if existing and existing.status == AIPlanRequest.Status.GENERATING:
            rec = recover_abandoned_ai_plan_request(existing.id, min_age_seconds=300)
            if rec.get("recovered"):
                existing = AIPlanRequest.objects.filter(
                    client=request.user,
                    status__in=[AIPlanRequest.Status.PENDING, AIPlanRequest.Status.GENERATING, AIPlanRequest.Status.GENERATED, AIPlanRequest.Status.TRAINER_REVIEWED]
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

        # Determine week number
        last_assigned = AIPlanRequest.objects.filter(
            client=request.user, status=AIPlanRequest.Status.ASSIGNED
        ).order_by("-week_number").first()
        week_number = (last_assigned.week_number + 1) if last_assigned else 1

        # Eligibility check and context assembly for Week 2+
        previous_progress = None
        if week_number > 1 and last_assigned:
            from django.utils import timezone
            # Check eligibility (e.g. 6 days passed since assignment)
            if last_assigned.updated_at:
                days_passed = (timezone.now() - last_assigned.updated_at).days
                if days_passed < 6:
                    return Response(
                        {"detail": f"Week {last_assigned.week_number} is still active. Please wait until day 7 to generate the next plan."},
                        status=400
                    )
            
            # Combine previous questionnaire with incoming feedback
            merged_data = last_assigned.questionnaire.copy() if last_assigned.questionnaire else {}
            merged_data.update(request.data)
        else:
            merged_data = request.data
            
        serializer = AIPlanRequestCreateSerializer(data=merged_data)
        serializer.is_valid(raise_exception=True)
        questionnaire = serializer.validated_data

        # Get assigned trainer — required for plan generation
        ta = TrainerAssignment.objects.filter(client=request.user, is_active=True).first()
        trainer = ta.trainer if ta else None

        if not trainer:
            return Response(
                {
                    "detail": "You need to be assigned to a trainer before generating an AI plan. "
                              "Please contact the admin to get a trainer assigned to you.",
                    "error_code": "NO_TRAINER_ASSIGNED",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Build actual empirical progress + feedback for adaptive plan
        if week_number > 1 and last_assigned:
            progress_data = build_progress_context(last_assigned)
            if not progress_data:
                progress_data = {}
            client_feedback = questionnaire.get('feedback', '')
            if client_feedback:
                progress_data['client_feedback'] = client_feedback
            previous_progress = progress_data

        with transaction.atomic():
            ai_request = AIPlanRequest.objects.create(
                client=request.user,
                trainer=trainer,
                week_number=week_number,
                questionnaire=questionnaire,
                previous_progress=previous_progress,
                status=AIPlanRequest.Status.PENDING,
            )

            def _queue_generation(req_id):
                try:
                    generate_ai_plan_task.delay(req_id)
                except Exception as exc:
                    logger.exception(f"Failed to queue Celery task for request_id={req_id}: {exc}")
                    AIPlanRequest.objects.filter(id=req_id).update(
                        status=AIPlanRequest.Status.GENERATION_FAILED,
                        error_message=f"Failed to queue background generation task: {str(exc)}",
                    )

            transaction.on_commit(lambda: _queue_generation(ai_request.id))

        return Response(
            {
                "success": True,
                "message": f"Week {week_number} AI plan generation has started in the background. Your trainer will review it shortly.",
                "request_id": ai_request.id,
                "status": ai_request.status,
            },
            status=status.HTTP_202_ACCEPTED,
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

        # Check if the client has an abandoned GENERATING request older than 5 minutes
        generating_req = AIPlanRequest.objects.filter(
            client=request.user,
            status=AIPlanRequest.Status.GENERATING,
        ).first()
        if generating_req:
            recover_abandoned_ai_plan_request(generating_req.id, min_age_seconds=300)

        requests = AIPlanRequest.objects.filter(client=request.user).order_by("-week_number", "-created_at")
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
        with transaction.atomic():
            new_req = AIPlanRequest.objects.create(
                client=ai_req.client,
                trainer=ai_req.trainer,
                week_number=ai_req.week_number,
                questionnaire=ai_req.questionnaire,
                previous_progress=ai_req.previous_progress,
                status=AIPlanRequest.Status.PENDING,
            )

            # Mark old as failed
            ai_req.status = AIPlanRequest.Status.GENERATION_FAILED
            ai_req.error_message = "Trainer requested regeneration."
            ai_req.save(update_fields=["status", "error_message"])

            def _queue_regeneration(req_id):
                try:
                    generate_ai_plan_task.delay(req_id)
                except Exception as exc:
                    logger.exception(f"Failed to queue Celery task for regeneration request_id={req_id}: {exc}")
                    AIPlanRequest.objects.filter(id=req_id).update(
                        status=AIPlanRequest.Status.GENERATION_FAILED,
                        error_message=f"Failed to queue background regeneration task: {str(exc)}",
                    )

            transaction.on_commit(lambda: _queue_regeneration(new_req.id))

        return Response(
            {
                "success": True,
                "message": "New AI plan generation has started in the background for trainer review.",
                "request_id": new_req.id,
                "status": new_req.status,
            },
            status=status.HTTP_202_ACCEPTED,
        )


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

        with transaction.atomic():
            new_req = AIPlanRequest.objects.create(
                client=current_req.client,
                trainer=current_req.trainer,
                week_number=current_req.week_number + 1,
                questionnaire=current_req.questionnaire,  # reuse original preferences
                previous_progress=progress,
                status=AIPlanRequest.Status.PENDING,
            )

            def _queue_next_week(req_id):
                try:
                    generate_ai_plan_task.delay(req_id)
                except Exception as exc:
                    logger.exception(f"Failed to queue Celery task for next week request_id={req_id}: {exc}")
                    AIPlanRequest.objects.filter(id=req_id).update(
                        status=AIPlanRequest.Status.GENERATION_FAILED,
                        error_message=f"Failed to queue background generation task: {str(exc)}",
                    )

            transaction.on_commit(lambda: _queue_next_week(new_req.id))

        return Response(
            {
                "success": True,
                "message": f"Week {new_req.week_number} AI plan generation has started in the background! Please review once complete.",
                "request_id": new_req.id,
                "status": new_req.status,
            },
            status=status.HTTP_202_ACCEPTED,
        )
