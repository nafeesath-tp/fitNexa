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


def _calculate_prorated_upgrade_amount(
    existing_sub: ClientSubscription,
    new_plan: SubscriptionPlan,
    new_billing_cycle: str,
) -> Decimal:
    """
    Calculate the prorated amount the client owes when upgrading plans.

    Logic:
        credit = (days_remaining / total_days) * amount_already_paid
        charge  = new_plan_price - credit

    If the result is negative (e.g. client overpaid), charge 0.
    """
    now = timezone.now()
    new_price = _calculate_amount(new_plan, new_billing_cycle)

    if not existing_sub or not existing_sub.expires_at or not existing_sub.started_at:
        return new_price  # no proration possible — charge full price

    total_seconds  = (existing_sub.expires_at - existing_sub.started_at).total_seconds()
    remain_seconds = (existing_sub.expires_at - now).total_seconds()

    if total_seconds <= 0 or remain_seconds <= 0:
        return new_price  # already expired — charge full price

    ratio  = Decimal(str(remain_seconds / total_seconds))
    credit = (ratio * existing_sub.amount_paid).quantize(Decimal('0.01'))
    charge = new_price - credit

    return max(charge, Decimal('0.00'))


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
    - Client cannot subscribe to the same plan they are already on.
    - If upgrading (different plan), the old ACTIVE subscription stays ACTIVE
      until Stripe payment is confirmed — it is NOT cancelled here.
      This prevents the client from losing access if they abandon the payment.
    - Any stale PENDING subscriptions (previous uncompleted attempts) are
      cancelled upfront to keep the DB clean.
    - Prorated amount is calculated upfront based on the current ACTIVE sub.
    - New subscription starts fresh (30 days / 365 days from activation date).
    """
    plan = SubscriptionPlan.objects.get(id=plan_id)

    # Check if client already has an ACTIVE subscription
    existing_active = ClientSubscription.objects.filter(
        client=user,
        payment_status=ClientSubscription.PaymentStatus.ACTIVE,
    ).first()

    if existing_active and existing_active.plan.id == plan_id:
        raise serializers.ValidationError(
            {"detail": "You are already subscribed to this plan."}
        )

    # Calculate prorated amount NOW (before cleaning up stale records)
    if existing_active:
        amount = _calculate_prorated_upgrade_amount(existing_active, plan, billing_cycle)
    else:
        amount = _calculate_amount(plan, billing_cycle)

    # Cancel any stale PENDING subscriptions (abandoned Stripe sessions)
    # The old ACTIVE plan is intentionally left untouched until payment succeeds.
    ClientSubscription.objects.filter(
        client=user,
        payment_status=ClientSubscription.PaymentStatus.PENDING,
    ).update(payment_status=ClientSubscription.PaymentStatus.CANCELLED)

    subscription = ClientSubscription.objects.create(
        client        = user,
        plan          = plan,
        billing_cycle = billing_cycle,
        payment_status= ClientSubscription.PaymentStatus.PENDING,
        auto_renew    = auto_renew,
        amount_paid   = amount,
    )

    return subscription


def confirm_subscription_payment(user, subscription_id: int) -> ClientSubscription:
    """
    Confirm payment locally (dev/testing only).
    Activates the PENDING subscription and cancels any other ACTIVE plan
    the client had — same logic as the Stripe webhook.
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

    # Activate the new subscription
    subscription = _activate_subscription(subscription)

    # Cancel any old ACTIVE subscriptions now that payment is confirmed
    ClientSubscription.objects.filter(
        client=user,
        payment_status=ClientSubscription.PaymentStatus.ACTIVE,
    ).exclude(id=subscription.id).update(
        payment_status=ClientSubscription.PaymentStatus.CANCELLED
    )

    return subscription


def handle_successful_payment(subscription_id: int):
    """
    Called by the Stripe Webhook when checkout.session.completed fires.

    Activates the new subscription, then cancels any previously ACTIVE
    subscription the client had (the old plan they were upgrading from).
    This is the ONLY place where the old plan gets cancelled — ensuring
    the client never loses access if they abandon the Stripe checkout.
    """
    try:
        subscription = ClientSubscription.objects.select_related('client').get(
            id=subscription_id
        )
        if subscription.payment_status == ClientSubscription.PaymentStatus.PENDING:
            # Step 1: Activate new subscription
            _activate_subscription(subscription)

            # Step 2: Cancel the client's old ACTIVE subscription (if any)
            ClientSubscription.objects.filter(
                client=subscription.client,
                payment_status=ClientSubscription.PaymentStatus.ACTIVE,
            ).exclude(id=subscription.id).update(
                payment_status=ClientSubscription.PaymentStatus.CANCELLED
            )
    except ClientSubscription.DoesNotExist:
        pass


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
