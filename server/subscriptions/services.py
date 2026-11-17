"""
Subscription Service Layer
==========================
All business logic lives here — views stay thin.

Payment integration:
  Stripe Checkout Session is initiated via `create-stripe-session`,
  and confirmed via Stripe webhook calling `handle_successful_payment`.
  A simulated confirm endpoint (`confirm_subscription_payment`) is also available for testing.
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
    """Return expiry datetime based on billing cycle (28 days for monthly, 364 days for yearly)."""
    now = timezone.now()
    if billing_cycle == ClientSubscription.BillingCycle.YEARLY:
        return now + timedelta(days=364)
    return now + timedelta(days=28)


def _activate_subscription(subscription: ClientSubscription) -> ClientSubscription:
    """
    Move a subscription from PENDING → ACTIVE.
    Sets started_at and expires_at.
    Allocates initial 28-day period credits (12 PT or 16 Group) via payments service.
    """
    now = timezone.now()
    subscription.payment_status = ClientSubscription.PaymentStatus.ACTIVE
    subscription.started_at     = now
    subscription.expires_at     = _calculate_expiry(subscription.billing_cycle)
    subscription.save(update_fields=["payment_status", "started_at", "expires_at", "updated_at"])

    # Allocate initial period credits atomically with idempotency protection
    from payments.services import allocate_subscription_credits
    allocate_subscription_credits(subscription, period_number=1)

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
    Records PaymentTransaction, activates the PENDING subscription,
    allocates credits, and cancels any other ACTIVE plan.
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

    # Record payment transaction
    from payments.services import record_payment_transaction
    from payments.models import PaymentTransaction
    record_payment_transaction(
        subscription=subscription,
        amount=subscription.amount_paid,
        transaction_type=PaymentTransaction.TransactionType.SUBSCRIPTION_PURCHASE,
        status=PaymentTransaction.Status.SUCCESS,
        payment_gateway="SIMULATED",
        stripe_session_id=subscription.stripe_session_id or f"sim_{subscription.id}",
        idempotency_key=f"SIMULATED_CONFIRM_SUB_{subscription.id}",
    )

    # Activate the new subscription (which allocates credits)
    subscription = _activate_subscription(subscription)

    # Cancel any old ACTIVE subscriptions now that payment is confirmed
    ClientSubscription.objects.filter(
        client=user,
        payment_status=ClientSubscription.PaymentStatus.ACTIVE,
    ).exclude(id=subscription.id).update(
        payment_status=ClientSubscription.PaymentStatus.CANCELLED
    )

    return subscription


def handle_successful_payment(subscription_id: int, stripe_session: dict = None):
    """
    Called by the Stripe Webhook when checkout.session.completed fires.

    Records PaymentTransaction with idempotency protection, activates the
    new subscription (allocating credits), and cancels old active plans.
    """
    try:
        subscription = ClientSubscription.objects.select_related('client', 'plan').get(
            id=subscription_id
        )
        from payments.services import record_payment_transaction
        from payments.models import PaymentTransaction

        session_id = (stripe_session or {}).get('id') or subscription.stripe_session_id or f"sub_{subscription.id}"
        payment_intent = (stripe_session or {}).get('payment_intent', '')

        record_payment_transaction(
            subscription=subscription,
            amount=subscription.amount_paid,
            transaction_type=PaymentTransaction.TransactionType.SUBSCRIPTION_PURCHASE,
            status=PaymentTransaction.Status.SUCCESS,
            payment_gateway="STRIPE",
            stripe_session_id=session_id,
            stripe_payment_intent_id=payment_intent,
            idempotency_key=f"STRIPE_CHECKOUT_{session_id}",
            raw_response=stripe_session or {},
        )

        if subscription.payment_status == ClientSubscription.PaymentStatus.PENDING:
            # Step 1: Activate new subscription (allocates credits)
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
    """Return the client's current ACTIVE subscription, releasing any due 28-day credits."""
    sub = (
        ClientSubscription.objects
        .select_related("plan")
        .filter(client=user, payment_status=ClientSubscription.PaymentStatus.ACTIVE)
        .order_by("-started_at")
        .first()
    )
    if sub:
        from payments.services import check_and_allocate_period_credits
        check_and_allocate_period_credits(user, sub)
    return sub


def get_subscription_history(user) -> list:
    """Return all subscriptions for a client, newest first."""
    return (
        ClientSubscription.objects
        .select_related("plan")
        .filter(client=user)
        .order_by("-created_at")
    )
