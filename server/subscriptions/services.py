"""
Subscription Service Layer
==========================
All business logic lives here — views stay thin.

Razorpay integration point:
  When Razorpay is added, replace the body of `confirm_subscription_payment`
  with a Razorpay order verification call, then call the same
  `_activate_subscription` helper.
"""

from decimal import Decimal
from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import SubscriptionPlan, ClientSubscription


# ── Helpers ───────────────────────────────────────────────────────────────────

def _calculate_amount(plan: SubscriptionPlan, billing_cycle: str) -> Decimal:
    """Return the correct price for the chosen billing cycle."""
    if billing_cycle == ClientSubscription.BillingCycle.YEARLY:
        return plan.price_yearly
    return plan.price_monthly


def _calculate_expiry(billing_cycle: str) -> object:
    """Return expiry datetime based on billing cycle."""
    now = timezone.now()
    if billing_cycle == ClientSubscription.BillingCycle.YEARLY:
        return now + timedelta(days=365)
    return now + timedelta(days=30)


def _activate_subscription(subscription: ClientSubscription) -> ClientSubscription:
    """
    Move a subscription from PENDING → ACTIVE.
    Sets started_at and expires_at.
    Called by confirm_subscription_payment (and later by Razorpay webhook).
    """
    now = timezone.now()
    subscription.payment_status = ClientSubscription.PaymentStatus.ACTIVE
    subscription.started_at     = now
    subscription.expires_at     = _calculate_expiry(subscription.billing_cycle)
    subscription.save(update_fields=["payment_status", "started_at", "expires_at", "updated_at"])
    return subscription


# ── Public ────────────────────────────────────────────────────────────────────

def get_active_plans() -> list:
    """Return all active subscription plans ordered by price."""
    return SubscriptionPlan.objects.filter(is_active=True).order_by("price_monthly")


# ── Admin ─────────────────────────────────────────────────────────────────────

def create_plan(validated_data: dict) -> SubscriptionPlan:
    """Create a new subscription plan."""
    if SubscriptionPlan.objects.filter(name=validated_data["name"]).exists():
        raise serializers.ValidationError(
            {"name": f"A plan named '{validated_data['name']}' already exists."}
        )
    return SubscriptionPlan.objects.create(**validated_data)


def update_plan(plan: SubscriptionPlan, validated_data: dict) -> SubscriptionPlan:
    """Partial-update a plan. Only supplied fields are changed."""
    for field, value in validated_data.items():
        setattr(plan, field, value)
    plan.save()
    return plan


def get_all_subscriptions() -> list:
    """Admin: all subscriptions across all clients."""
    return (
        ClientSubscription.objects
        .select_related("client", "plan")
        .order_by("-created_at")
    )


# ── Client ────────────────────────────────────────────────────────────────────

def purchase_subscription(user, plan_id: int, billing_cycle: str, auto_renew: bool) -> ClientSubscription:
    """
    Create a ClientSubscription with payment_status=PENDING.

    Business rules:
    - Client can't have two ACTIVE subscriptions to the same plan.
    - Cancel any existing ACTIVE subscription before upgrading.
      (Upgrade = different plan. The old subscription is CANCELLED.)
    - FREE plan subscriptions are activated immediately (no payment needed).
    """
    plan = SubscriptionPlan.objects.get(id=plan_id)

    # Cancel any current ACTIVE subscription (upgrade/change flow)
    existing_active = ClientSubscription.objects.filter(
        client=user,
        payment_status=ClientSubscription.PaymentStatus.ACTIVE,
    ).first()

    if existing_active:
        if existing_active.plan.id == plan_id:
            raise serializers.ValidationError(
                {"detail": "You are already subscribed to this plan."}
            )
        # Cancel the old one before creating the new subscription
        existing_active.payment_status = ClientSubscription.PaymentStatus.CANCELLED
        existing_active.save(update_fields=["payment_status", "updated_at"])

    amount = _calculate_amount(plan, billing_cycle)

    subscription = ClientSubscription.objects.create(
        client        = user,
        plan          = plan,
        billing_cycle = billing_cycle,
        payment_status= ClientSubscription.PaymentStatus.PENDING,
        auto_renew    = auto_renew,
        amount_paid   = amount,
    )

    # FREE plans require no payment — activate immediately
    if plan.name == SubscriptionPlan.PlanName.FREE:
        subscription = _activate_subscription(subscription)

    return subscription


def confirm_subscription_payment(user, subscription_id: int) -> ClientSubscription:
    """
    Simulate Razorpay payment confirmation.

    In production this becomes:
        1. Verify Razorpay signature
        2. Call _activate_subscription
    """
    try:
        subscription = ClientSubscription.objects.get(
            id=subscription_id, client=user,
        )
    except ClientSubscription.DoesNotExist:
        raise serializers.ValidationError({"detail": "Subscription not found."})

    if subscription.payment_status != ClientSubscription.PaymentStatus.PENDING:
        raise serializers.ValidationError(
            {"detail": f"Subscription is already {subscription.payment_status}."}
        )

    return _activate_subscription(subscription)


def get_current_subscription(user) -> ClientSubscription | None:
    """Return the client's current ACTIVE subscription, or None."""
    return (
        ClientSubscription.objects
        .select_related("plan")
        .filter(client=user, payment_status=ClientSubscription.PaymentStatus.ACTIVE)
        .order_by("-started_at")
        .first()
    )


def get_subscription_history(user) -> list:
    """Return all subscriptions for a client, newest first."""
    return (
        ClientSubscription.objects
        .select_related("plan")
        .filter(client=user)
        .order_by("-created_at")
    )
