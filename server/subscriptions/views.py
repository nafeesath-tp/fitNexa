from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated

from accounts.permissions import IsAdmin, IsClient

from .serializers import (
    SubscriptionPlanSerializer,
    AdminSubscriptionPlanSerializer,
    ClientSubscriptionSerializer,
    PurchaseSubscriptionSerializer,
    AdminClientSubscriptionSerializer,
)
from . import services
from .models import SubscriptionPlan, ClientSubscription


# ── Public ────────────────────────────────────────────────────────────────────

class PublicPlanListAPIView(APIView):
    """
    GET /api/subscriptions/plans/

    Returns all ACTIVE plans.  No authentication required — used on the
    marketing / pricing page and the client plans page.

    Permissions: AllowAny
    """
    permission_classes = [AllowAny]

    def get(self, request):
        plans = services.get_active_plans()
        data  = SubscriptionPlanSerializer(plans, many=True).data
        return Response(
            {"success": True, "message": "Plans retrieved.", "data": data},
            status=status.HTTP_200_OK,
        )


# ── Admin ─────────────────────────────────────────────────────────────────────

class AdminPlanListCreateAPIView(APIView):
    """
    GET  /api/subscriptions/admin/plans/   — list ALL plans (including inactive)
    POST /api/subscriptions/admin/plans/   — create a new plan

    Permissions: IsAdmin
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        plans = SubscriptionPlan.objects.all().order_by("price_monthly")
        data  = AdminSubscriptionPlanSerializer(plans, many=True).data
        return Response(
            {"success": True, "message": "All plans retrieved.", "data": data},
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = AdminSubscriptionPlanSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "message": "Invalid input.", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            plan = services.create_plan(serializer.validated_data)
            return Response(
                {
                    "success": True,
                    "message": f"Plan '{plan.name}' created.",
                    "data": AdminSubscriptionPlanSerializer(plan).data,
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            from rest_framework.exceptions import ValidationError
            if isinstance(e, ValidationError):
                return Response(
                    {"success": False, "message": "Creation failed.", "errors": e.detail},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(
                {"success": False, "message": "Something went wrong."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AdminPlanDetailAPIView(APIView):
    """
    GET    /api/subscriptions/admin/plans/<id>/   — retrieve single plan
    PATCH  /api/subscriptions/admin/plans/<id>/   — update (name, price, features, is_active)
    DELETE /api/subscriptions/admin/plans/<id>/   — soft-delete (sets is_active=False)

    Permissions: IsAdmin
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def _get_plan(self, plan_id):
        try:
            return SubscriptionPlan.objects.get(id=plan_id)
        except SubscriptionPlan.DoesNotExist:
            return None

    def get(self, request, plan_id):
        plan = self._get_plan(plan_id)
        if not plan:
            return Response(
                {"success": False, "message": "Plan not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {"success": True, "data": AdminSubscriptionPlanSerializer(plan).data},
            status=status.HTTP_200_OK,
        )

    def patch(self, request, plan_id):
        plan = self._get_plan(plan_id)
        if not plan:
            return Response(
                {"success": False, "message": "Plan not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = AdminSubscriptionPlanSerializer(plan, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(
                {"success": False, "message": "Invalid input.", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        updated = services.update_plan(plan, serializer.validated_data)
        return Response(
            {
                "success": True,
                "message": "Plan updated.",
                "data": AdminSubscriptionPlanSerializer(updated).data,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, plan_id):
        plan = self._get_plan(plan_id)
        if not plan:
            return Response(
                {"success": False, "message": "Plan not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        # Soft-delete: deactivate rather than destroy
        plan.is_active = False
        plan.save(update_fields=["is_active", "updated_at"])
        return Response(
            {"success": True, "message": f"Plan '{plan.name}' deactivated."},
            status=status.HTTP_200_OK,
        )


class AdminSubscriptionListAPIView(APIView):
    """
    GET /api/subscriptions/admin/subscriptions/
    List all client subscriptions across all users.

    Permissions: IsAdmin
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        subs = services.get_all_subscriptions()
        data = AdminClientSubscriptionSerializer(subs, many=True).data
        return Response(
            {"success": True, "message": "Subscriptions retrieved.", "data": data},
            status=status.HTTP_200_OK,
        )


# ── Client ────────────────────────────────────────────────────────────────────

class ClientPurchaseAPIView(APIView):
    """
    POST /api/subscriptions/client/purchase/

    Body: { plan_id, billing_cycle, auto_renew }

    Creates a ClientSubscription with payment_status=PENDING.
    FREE plans are activated immediately.
    Paid plans require a subsequent call to /client/<id>/confirm/ to
    simulate (or in future, receive) Razorpay confirmation.

    Permissions: IsClient
    """
    permission_classes = [IsAuthenticated, IsClient]

    def post(self, request):
        serializer = PurchaseSubscriptionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "message": "Invalid input.", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            subscription = services.purchase_subscription(
                user          = request.user,
                plan_id       = serializer.validated_data["plan_id"],
                billing_cycle = serializer.validated_data["billing_cycle"],
                auto_renew    = serializer.validated_data["auto_renew"],
            )
            return Response(
                {
                    "success": True,
                    "message": (
                        "Subscribed successfully!"
                        if subscription.payment_status == ClientSubscription.PaymentStatus.ACTIVE
                        else "Subscription created. Complete payment to activate."
                    ),
                    "data": ClientSubscriptionSerializer(subscription).data,
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            from rest_framework.exceptions import ValidationError
            if isinstance(e, ValidationError):
                return Response(
                    {"success": False, "message": "Purchase failed.", "errors": e.detail},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(
                {"success": False, "message": "Something went wrong."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ClientConfirmPaymentAPIView(APIView):
    """
    POST /api/subscriptions/client/<subscription_id>/confirm/

    Simulates Razorpay payment confirmation.
    Moves subscription from PENDING → ACTIVE and sets expiry dates.

    Razorpay integration: replace body of confirm_subscription_payment()
    in services.py — this view stays unchanged.

    Permissions: IsClient
    """
    permission_classes = [IsAuthenticated, IsClient]

    def post(self, request, subscription_id):
        try:
            subscription = services.confirm_subscription_payment(
                user=request.user, subscription_id=subscription_id
            )
            return Response(
                {
                    "success": True,
                    "message": "Payment confirmed! Your subscription is now active.",
                    "data": ClientSubscriptionSerializer(subscription).data,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            from rest_framework.exceptions import ValidationError
            if isinstance(e, ValidationError):
                return Response(
                    {"success": False, "message": "Confirmation failed.", "errors": e.detail},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(
                {"success": False, "message": "Something went wrong."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ClientCurrentSubscriptionAPIView(APIView):
    """
    GET /api/subscriptions/client/current/

    Returns the client's currently ACTIVE subscription, or 404 if none.

    Permissions: IsClient
    """
    permission_classes = [IsAuthenticated, IsClient]

    def get(self, request):
        subscription = services.get_current_subscription(request.user)
        if not subscription:
            return Response(
                {"success": False, "message": "No active subscription found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {
                "success": True,
                "message": "Current subscription retrieved.",
                "data": ClientSubscriptionSerializer(subscription).data,
            },
            status=status.HTTP_200_OK,
        )


class ClientSubscriptionHistoryAPIView(APIView):
    """
    GET /api/subscriptions/client/history/

    Returns all subscriptions (all statuses) for the authenticated client.

    Permissions: IsClient
    """
    permission_classes = [IsAuthenticated, IsClient]

    def get(self, request):
        subs = services.get_subscription_history(request.user)
        data = ClientSubscriptionSerializer(subs, many=True).data
        return Response(
            {"success": True, "message": "Subscription history retrieved.", "data": data},
            status=status.HTTP_200_OK,
        )
