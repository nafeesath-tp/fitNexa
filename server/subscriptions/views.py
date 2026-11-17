from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
import stripe
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
import logging

logger = logging.getLogger(__name__)

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

class ClientCreateStripeSessionAPIView(APIView):
    """
    POST /api/subscriptions/client/create-stripe-session/

    Body: { plan_id, billing_cycle, auto_renew }

    Creates a Stripe Checkout Session for the selected plan.
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

            # If FREE plan, it's already active
            if subscription.payment_status == ClientSubscription.PaymentStatus.ACTIVE:
                return Response(
                    {"success": True, "message": "Subscribed successfully!", "url": None},
                    status=status.HTTP_201_CREATED,
                )

            # Otherwise, create Stripe session
            # Plans are priced in USD; always charge Stripe in USD.
            # Admin finance dashboard converts USD → INR for display using exchange rate.
            stripe.api_key = settings.STRIPE_SECRET_KEY
            stripe_currency = 'usd'
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[
                    {
                        'price_data': {
                            'currency': stripe_currency,
                            'unit_amount': int(subscription.amount_paid * 100),  # USD cents (e.g. $84 → 8400 cents)
                            'product_data': {
                                'name': f"FitNexa {subscription.plan.name} Plan",
                            },
                        },
                        'quantity': 1,
                    },
                ],
                mode='payment',
                success_url=f"http://localhost:5173/client/checkout/success?session_id={{CHECKOUT_SESSION_ID}}&sub_id={subscription.id}",
                cancel_url="http://localhost:5173/client/checkout/cancel",
                client_reference_id=str(subscription.id),
                metadata={
                    'subscription_id': str(subscription.id),
                },
                payment_intent_data={
                    'metadata': {
                        'subscription_id': str(subscription.id),
                    }
                },
            )
            
            subscription.stripe_session_id = checkout_session.id
            subscription.save(update_fields=['stripe_session_id', 'updated_at'])

            # Log pending payment transaction
            from payments.services import record_payment_transaction
            from payments.models import PaymentTransaction
            record_payment_transaction(
                subscription=subscription,
                amount=subscription.amount_paid,
                transaction_type=PaymentTransaction.TransactionType.SUBSCRIPTION_PURCHASE,
                status=PaymentTransaction.Status.PENDING,
                payment_gateway="STRIPE",
                stripe_session_id=checkout_session.id,
                idempotency_key=f"STRIPE_CHECKOUT_{checkout_session.id}",
            )

            return Response(
                {"success": True, "url": checkout_session.url},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            from rest_framework.exceptions import ValidationError
            if isinstance(e, ValidationError):
                return Response(
                    {"success": False, "message": "Purchase failed.", "errors": e.detail},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(
                {"success": False, "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ClientConfirmPaymentAPIView(APIView):
    """
    POST /api/subscriptions/client/<subscription_id>/confirm/

    Simulates payment confirmation locally without external Stripe webhook.
    Strictly gated to local development/testing (DEBUG=True). Never allowed in production.

    Permissions: IsClient
    """
    permission_classes = [IsAuthenticated, IsClient]

    def post(self, request, subscription_id):
        if not getattr(settings, "DEBUG", False):
            return Response(
                {"success": False, "message": "Simulated payment confirmation is disabled in production environments."},
                status=status.HTTP_403_FORBIDDEN,
            )

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


class StripeWebhookAPIView(APIView):
    """
    POST /api/subscriptions/stripe-webhook/
    Stripe hits this endpoint when a payment succeeds.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        event = None

        stripe.api_key = settings.STRIPE_SECRET_KEY
        webhook_secret = settings.STRIPE_WEBHOOK_SECRET

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
        except ValueError as e:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.SignatureVerificationError as e:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            # Verify payment_status is actually 'paid'
            if session.get('payment_status') != 'paid':
                logger.warning(f"Checkout session {session.get('id')} completed with payment_status={session.get('payment_status')}, not activating.")
                return Response(status=status.HTTP_200_OK)

            sub_id = session.get('metadata', {}).get('subscription_id')
            if not sub_id and session.get('id'):
                from payments.models import PaymentTransaction
                pt = PaymentTransaction.objects.filter(stripe_session_id=session.get('id')).first()
                if pt:
                    sub_id = pt.subscription_id
            if sub_id:
                services.handle_successful_payment(sub_id, stripe_session=session)

        elif event['type'] == 'payment_intent.payment_failed':
            obj = event['data']['object']
            from django.db.models import Q
            from payments.models import PaymentTransaction
            from payments.services import handle_failed_payment_transaction
            sub_id = obj.get('metadata', {}).get('subscription_id')
            if not sub_id and obj.get('id'):
                pt = PaymentTransaction.objects.filter(
                    Q(stripe_payment_intent_id=obj.get('id')) | Q(stripe_session_id=obj.get('id'))
                ).first()
                if pt:
                    sub_id = pt.subscription_id
            if sub_id:
                try:
                    sub = ClientSubscription.objects.get(id=sub_id)
                    handle_failed_payment_transaction(
                        subscription=sub,
                        reason=obj.get('last_payment_error', {}).get('message', 'Payment failed'),
                        payment_gateway="STRIPE",
                        stripe_payment_intent_id=obj.get('id', ''),
                        raw_response=obj,
                    )
                except ClientSubscription.DoesNotExist:
                    pass

        elif event['type'] == 'checkout.session.async_payment_failed':
            obj = event['data']['object']
            from payments.models import PaymentTransaction
            from payments.services import handle_failed_payment_transaction
            sub_id = obj.get('metadata', {}).get('subscription_id')
            if not sub_id and obj.get('id'):
                pt = PaymentTransaction.objects.filter(stripe_session_id=obj.get('id')).first()
                if pt:
                    sub_id = pt.subscription_id
            if sub_id:
                try:
                    sub = ClientSubscription.objects.get(id=sub_id)
                    handle_failed_payment_transaction(
                        subscription=sub,
                        reason="Async checkout payment failed",
                        payment_gateway="STRIPE",
                        stripe_session_id=obj.get('id', ''),
                        raw_response=obj,
                    )
                except ClientSubscription.DoesNotExist:
                    pass

        elif event['type'] == 'charge.refunded':
            obj = event['data']['object']
            from decimal import Decimal
            from payments.services import handle_refunded_payment_transaction
            sub_id = obj.get('metadata', {}).get('subscription_id')
            if not sub_id and obj.get('payment_intent'):
                from payments.models import PaymentTransaction
                pt = PaymentTransaction.objects.filter(stripe_payment_intent_id=obj.get('payment_intent')).first()
                if pt:
                    sub_id = pt.subscription_id
            if sub_id:
                try:
                    sub = ClientSubscription.objects.get(id=sub_id)
                    raw_amount = obj.get('amount_refunded', 0)
                    amount_refunded = (Decimal(str(raw_amount)) / Decimal("100")).quantize(Decimal("0.01"))
                    refunds_list = obj.get('refunds', {}).get('data', [])
                    refund_id = refunds_list[0].get('id') if refunds_list else obj.get('id', '')
                    handle_refunded_payment_transaction(
                        subscription=sub,
                        refund_amount=amount_refunded,
                        stripe_refund_id=refund_id,
                        payment_gateway="STRIPE",
                        raw_response=obj,
                    )
                except ClientSubscription.DoesNotExist:
                    pass

        return Response(status=status.HTTP_200_OK)
