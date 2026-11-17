"""
Module 19: Payment, Transaction, Credit Allocation & Financial Engine Services
"""
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
import logging
from django.db import transaction, models
from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.core.exceptions import ValidationError

from accounts.models import User
from client.models import ClientProfile
from subscriptions.models import ClientSubscription, SubscriptionPlan
from .models import (
    PaymentTransaction,
    SubscriptionCreditLedger,
    TrainerWallet,
    TrainerEarning,
    TrainerPayout,
    WalletTransaction,
    AlternativeBatchTransfer,
)
from .constants import (
    get_commission_rates,
    calculate_session_commission,
    get_session_gross_value_from_subscription,
    MONTHLY_PACKAGE_DAYS,
    YEARLY_PACKAGE_DAYS,
    DAYS_PER_CREDIT_PERIOD,
    PERSONAL_TRAINING_PERIOD_CREDITS,
    GROUP_WORKOUT_PERIOD_CREDITS,
    VALID_SESSION_TYPES,
)

logger = logging.getLogger(__name__)


# ── Payment Transaction Services ─────────────────────────────────────────────

def record_payment_transaction(
    subscription: ClientSubscription,
    amount: Decimal,
    currency: str = None,
    transaction_type: str = PaymentTransaction.TransactionType.SUBSCRIPTION_PURCHASE,
    status: str = PaymentTransaction.Status.SUCCESS,
    payment_gateway: str = "STRIPE",
    stripe_session_id: str = "",
    stripe_payment_intent_id: str = "",
    idempotency_key: str = None,
    raw_response: dict = None,
) -> PaymentTransaction:
    """
    Creates or updates a PaymentTransaction record with database-level idempotency protection.
    Prevents duplicate processing of repeated Stripe webhooks.
    """
    with transaction.atomic():
        if not idempotency_key and stripe_session_id:
            idempotency_key = f"PAYMENT_TX_{payment_gateway}_{stripe_session_id}"

        # Determine currency: explicit parameter -> raw_response -> USD for Stripe / INR default
        tx_currency = (
            currency
            or (raw_response or {}).get("currency")
            or ("USD" if payment_gateway == "STRIPE" else "INR")
        ).upper()

        defaults = {
            "client": subscription.client,
            "subscription": subscription,
            "transaction_type": transaction_type,
            "amount": Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            "currency": tx_currency,
            "status": status,
            "payment_gateway": payment_gateway,
            "stripe_session_id": stripe_session_id or subscription.stripe_session_id or "",
            "stripe_payment_intent_id": stripe_payment_intent_id or "",
            "raw_response": raw_response or {},
        }

        if idempotency_key:
            tx, created = PaymentTransaction.objects.update_or_create(
                idempotency_key=idempotency_key,
                defaults=defaults,
            )
            return tx

        return PaymentTransaction.objects.create(**defaults)


def handle_failed_payment_transaction(
    subscription: ClientSubscription,
    reason: str = "",
    payment_gateway: str = "STRIPE",
    stripe_session_id: str = "",
    stripe_payment_intent_id: str = "",
    raw_response: dict = None,
) -> PaymentTransaction:
    """
    Records a failed payment transaction and updates subscription payment_status to FAILED.
    Deterministic idempotency key ensures repeated Stripe webhooks do not create duplicate records.
    """
    with transaction.atomic():
        subscription.payment_status = ClientSubscription.PaymentStatus.FAILED
        subscription.save(update_fields=["payment_status", "updated_at"])

        tx_ref = stripe_session_id or stripe_payment_intent_id or str(subscription.id)
        idempotency_key = f"PAYMENT_FAIL_{payment_gateway}_{tx_ref}"
        defaults = {
            "client": subscription.client,
            "subscription": subscription,
            "transaction_type": PaymentTransaction.TransactionType.SUBSCRIPTION_PURCHASE,
            "amount": Decimal(str(subscription.amount_paid)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            "currency": "INR",
            "status": PaymentTransaction.Status.FAILED,
            "payment_gateway": payment_gateway,
            "stripe_session_id": stripe_session_id or subscription.stripe_session_id or "",
            "stripe_payment_intent_id": stripe_payment_intent_id or "",
            "raw_response": {"failure_reason": reason, **(raw_response or {})},
        }
        tx, _ = PaymentTransaction.objects.update_or_create(
            idempotency_key=idempotency_key,
            defaults=defaults,
        )
        return tx


def handle_refunded_payment_transaction(
    subscription: ClientSubscription,
    refund_amount: Decimal,
    stripe_refund_id: str = "",
    payment_gateway: str = "STRIPE",
    raw_response: dict = None,
) -> PaymentTransaction:
    """
    Records a refunded payment transaction.
    Deterministic idempotency key ensures repeated Stripe refund webhooks do not duplicate.
    Preserves actual refund reference in raw_response and does not overwrite stripe_payment_intent_id with refund ID.
    """
    with transaction.atomic():
        tx_ref = stripe_refund_id or str(subscription.id)
        idempotency_key = f"PAYMENT_REFUND_{payment_gateway}_{tx_ref}"
        
        # Look up original payment intent ID from existing successful transactions
        original_tx = PaymentTransaction.objects.filter(
            subscription=subscription,
            status=PaymentTransaction.Status.SUCCESS,
        ).first()
        original_pi = original_tx.stripe_payment_intent_id if original_tx else ""

        payload_raw = raw_response or {}
        if stripe_refund_id:
            payload_raw["refund_id"] = stripe_refund_id

        defaults = {
            "client": subscription.client,
            "subscription": subscription,
            "transaction_type": PaymentTransaction.TransactionType.REFUND,
            "amount": Decimal(str(refund_amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            "currency": "INR",
            "status": PaymentTransaction.Status.REFUNDED,
            "payment_gateway": payment_gateway,
            "stripe_session_id": subscription.stripe_session_id or "",
            "stripe_payment_intent_id": original_pi,
            "raw_response": payload_raw,
        }
        tx, _ = PaymentTransaction.objects.update_or_create(
            idempotency_key=idempotency_key,
            defaults=defaults,
        )
        return tx


# ── Credit Allocation & Expiration Engine ────────────────────────────────────

def allocate_subscription_credits(
    subscription: ClientSubscription,
    period_number: int = 1,
) -> SubscriptionCreditLedger | None:
    """
    Allocates credits to ClientProfile for a specific 28-day period.
    - Premium: 12 Personal Training credits per 28-day period.
    - Group: 16 Group Workout credits per 28-day period.

    Guarantees:
    - Atomic update of ClientProfile balance and SubscriptionCreditLedger.
    - Idempotency key `SUB_{subscription.id}_PERIOD_{period_number}_GRANT` ensures
      no period can EVER be credited twice, even with concurrent webhook events.
    """
    plan_name = subscription.plan.name.upper()
    idempotency_key = f"SUB_{subscription.id}_PERIOD_{period_number}_GRANT"

    with transaction.atomic():
        # Fast exit if already granted for this period
        if SubscriptionCreditLedger.objects.filter(idempotency_key=idempotency_key).exists():
            logger.info(f"Credits for {idempotency_key} already allocated. Skipping duplicate grant.")
            return None

        # Lock client profile row
        try:
            profile = ClientProfile.objects.select_for_update().get(user=subscription.client)
        except ClientProfile.DoesNotExist:
            profile = ClientProfile.objects.create(user=subscription.client)

        if plan_name == "PREMIUM":
            credit_amount = PERSONAL_TRAINING_PERIOD_CREDITS
            profile.session_credits += credit_amount
            profile.save(update_fields=["session_credits"])
            new_balance = profile.session_credits
            credit_type = SubscriptionCreditLedger.CreditType.PERSONAL_TRAINING
            reason = f"Allocated {credit_amount} Personal Training credits for 28-day period #{period_number}"

        elif plan_name == "GROUP":
            credit_amount = GROUP_WORKOUT_PERIOD_CREDITS
            profile.group_session_credits += credit_amount
            profile.save(update_fields=["group_session_credits"])
            new_balance = profile.group_session_credits
            credit_type = SubscriptionCreditLedger.CreditType.GROUP_WORKOUT
            reason = f"Allocated {credit_amount} Group Workout credits for 28-day period #{period_number}"

        else:
            logger.info(f"Plan {plan_name} has no session credit entitlement.")
            return None

        ledger = SubscriptionCreditLedger.objects.create(
            client=subscription.client,
            subscription=subscription,
            credit_type=credit_type,
            action=SubscriptionCreditLedger.Action.ALLOCATED,
            amount=credit_amount,
            period_number=period_number,
            balance_after=new_balance,
            reason=reason,
            idempotency_key=idempotency_key,
        )
        logger.info(f"Successfully allocated {credit_amount} {credit_type} credits to {subscription.client.email} for period #{period_number}.")
        return ledger


def expire_unused_period_credits(client: User, subscription: ClientSubscription = None) -> int:
    """
    Enforces BUSINESS DECISION 1: NO AUTOMATIC CREDIT ROLLOVER.
    Unused credits expire at the end of each 28-day period.
    Credits must not accumulate indefinitely.

    Safety Rules:
    - Never wipes profile balances to 0 if credits belong to another subscription.
    - Expiry for one subscription does NOT delete credits belonging to another subscription.
    - Pending alternative transfers protect their original entitlement from period expiry.
    """
    now = timezone.now()

    if subscription is not None:
        subs_to_check = [subscription]
    else:
        subs_to_check = list(
            ClientSubscription.objects
            .select_related("plan")
            .filter(client=client)
            .order_by("-started_at")
        )

    if not subs_to_check:
        return 0

    total_expired = 0

    with transaction.atomic():
        try:
            profile = ClientProfile.objects.select_for_update().get(user=client)
        except ClientProfile.DoesNotExist:
            return 0

        for sub in subs_to_check:
            if not sub.started_at:
                continue

            plan_name = sub.plan.name.upper()
            is_yearly = (sub.billing_cycle == ClientSubscription.BillingCycle.YEARLY)
            elapsed_days = (now - sub.started_at).days
            current_period = min(13 if is_yearly else 1, max(1, (elapsed_days // DAYS_PER_CREDIT_PERIOD) + 1))
            is_fully_expired = bool(sub.expires_at and sub.expires_at <= now)

            eval_range = range(1, 14) if (is_fully_expired and is_yearly) else range(1, current_period)

            for p in eval_range:
                expire_key = f"SUB_{sub.id}_PERIOD_{p}_EXPIRE"
                if not SubscriptionCreditLedger.objects.filter(idempotency_key=expire_key).exists():
                    alloc_sum = SubscriptionCreditLedger.objects.filter(
                        subscription=sub,
                        period_number=p,
                        action=SubscriptionCreditLedger.Action.ALLOCATED,
                    ).aggregate(sum=Sum("amount"))["sum"] or 0

                    if alloc_sum > 0:
                        restored_sum = SubscriptionCreditLedger.objects.filter(
                            subscription=sub,
                            period_number=p,
                            action=SubscriptionCreditLedger.Action.RESTORED,
                        ).aggregate(sum=Sum("amount"))["sum"] or 0

                        consumed_sum = abs(SubscriptionCreditLedger.objects.filter(
                            subscription=sub,
                            period_number=p,
                            action=SubscriptionCreditLedger.Action.CONSUMED,
                        ).aggregate(sum=Sum("amount"))["sum"] or 0)

                        already_exp = abs(SubscriptionCreditLedger.objects.filter(
                            subscription=sub,
                            period_number=p,
                            action=SubscriptionCreditLedger.Action.EXPIRED,
                        ).aggregate(sum=Sum("amount"))["sum"] or 0)

                        # Check for pending alternative transfers protecting entitlements in this period
                        pending_in_period = 0
                        if plan_name == "GROUP":
                            for transfer in AlternativeBatchTransfer.objects.filter(
                                client=client,
                                status=AlternativeBatchTransfer.Status.PENDING,
                            ).select_related("original_session"):
                                if _get_period_number_for_session(sub, transfer.original_session) == p:
                                    pending_in_period += 1

                        sub_period_remaining = max(0, (alloc_sum + restored_sum) - consumed_sum - already_exp - pending_in_period)

                        if sub_period_remaining > 0:
                            if plan_name == "PREMIUM":
                                deduct = min(sub_period_remaining, profile.session_credits)
                                profile.session_credits -= deduct
                                profile.save(update_fields=["session_credits"])
                                bal = profile.session_credits
                                ctype = SubscriptionCreditLedger.CreditType.PERSONAL_TRAINING
                            else:
                                deduct = min(sub_period_remaining, profile.group_session_credits)
                                profile.group_session_credits -= deduct
                                profile.save(update_fields=["group_session_credits"])
                                bal = profile.group_session_credits
                                ctype = SubscriptionCreditLedger.CreditType.GROUP_WORKOUT

                            if deduct > 0:
                                SubscriptionCreditLedger.objects.create(
                                    client=client,
                                    subscription=sub,
                                    credit_type=ctype,
                                    action=SubscriptionCreditLedger.Action.EXPIRED,
                                    amount=-deduct,
                                    period_number=p,
                                    balance_after=bal,
                                    reason=f"Expired {deduct} unused credits from completed 28-day period #{p}",
                                    idempotency_key=expire_key,
                                    created_at=now,
                                )
                                total_expired += deduct

            # Final sweep for any remaining unconsumed credits upon subscription expiration
            if is_fully_expired:
                final_expire_key = f"SUB_{sub.id}_FINAL_SWEEP_EXPIRE"
                if not SubscriptionCreditLedger.objects.filter(idempotency_key=final_expire_key).exists():
                    period_num = 13 if is_yearly else 1

                    total_alloc = SubscriptionCreditLedger.objects.filter(
                        subscription=sub,
                        action=SubscriptionCreditLedger.Action.ALLOCATED,
                    ).aggregate(sum=Sum("amount"))["sum"] or 0

                    total_restored = SubscriptionCreditLedger.objects.filter(
                        subscription=sub,
                        action=SubscriptionCreditLedger.Action.RESTORED,
                    ).aggregate(sum=Sum("amount"))["sum"] or 0

                    total_consumed = abs(SubscriptionCreditLedger.objects.filter(
                        subscription=sub,
                        action=SubscriptionCreditLedger.Action.CONSUMED,
                    ).aggregate(sum=Sum("amount"))["sum"] or 0)

                    total_expired_so_far = abs(SubscriptionCreditLedger.objects.filter(
                        subscription=sub,
                        action=SubscriptionCreditLedger.Action.EXPIRED,
                    ).aggregate(sum=Sum("amount"))["sum"] or 0)

                    total_pending = 0
                    if plan_name == "GROUP":
                        total_pending = AlternativeBatchTransfer.objects.filter(
                            client=client,
                            status=AlternativeBatchTransfer.Status.PENDING,
                        ).count()

                    net_sub_remaining = max(0, (total_alloc + total_restored) - total_consumed - total_expired_so_far - total_pending)

                    if net_sub_remaining > 0:
                        if plan_name == "PREMIUM":
                            deduct = min(net_sub_remaining, profile.session_credits)
                            profile.session_credits -= deduct
                            profile.save(update_fields=["session_credits"])
                            SubscriptionCreditLedger.objects.create(
                                client=client,
                                subscription=sub,
                                credit_type=SubscriptionCreditLedger.CreditType.PERSONAL_TRAINING,
                                action=SubscriptionCreditLedger.Action.EXPIRED,
                                amount=-deduct,
                                period_number=period_num,
                                balance_after=profile.session_credits,
                                reason=f"Expired {deduct} remaining unused credits upon complete subscription expiry",
                                idempotency_key=final_expire_key,
                                created_at=now,
                            )
                            total_expired += deduct
                        elif plan_name == "GROUP":
                            deduct = min(net_sub_remaining, profile.group_session_credits)
                            profile.group_session_credits -= deduct
                            profile.save(update_fields=["group_session_credits"])
                            SubscriptionCreditLedger.objects.create(
                                client=client,
                                subscription=sub,
                                credit_type=SubscriptionCreditLedger.CreditType.GROUP_WORKOUT,
                                action=SubscriptionCreditLedger.Action.EXPIRED,
                                amount=-deduct,
                                period_number=period_num,
                                balance_after=profile.group_session_credits,
                                reason=f"Expired {deduct} remaining unused credits upon complete subscription expiry",
                                idempotency_key=final_expire_key,
                                created_at=now,
                            )
                            total_expired += deduct

    return total_expired


def check_and_allocate_period_credits(client: User, subscription: ClientSubscription = None) -> int:
    """
    On-demand credit release engine for yearly and active subscriptions.
    Evaluates elapsed 28-day periods since subscription.started_at.
    First expires unconsumed credits from ended periods, then allocates the current period.
    Zero Celery required: executes on-demand.
    """
    if subscription is None:
        subscription = (
            ClientSubscription.objects
            .select_related("plan")
            .filter(client=client, payment_status=ClientSubscription.PaymentStatus.ACTIVE)
            .order_by("-started_at")
            .first()
        )

    if not subscription or not subscription.started_at:
        return 0

    now = timezone.now()
    if subscription.expires_at and subscription.expires_at < now:
        expire_unused_period_credits(client, subscription)
        return 0

    # First run expiration on ended periods
    expire_unused_period_credits(client, subscription)

    elapsed_days = (now - subscription.started_at).days
    is_yearly = (subscription.billing_cycle == ClientSubscription.BillingCycle.YEARLY)

    max_periods = 13 if is_yearly else 1
    current_period = min(max_periods, max(1, (elapsed_days // DAYS_PER_CREDIT_PERIOD) + 1))

    allocated_count = 0
    for p in range(1, current_period + 1):
        idempotency_key = f"SUB_{subscription.id}_PERIOD_{p}_GRANT"
        if not SubscriptionCreditLedger.objects.filter(idempotency_key=idempotency_key).exists():
            res = allocate_subscription_credits(subscription, period_number=p)
            if res:
                allocated_count += res.amount

    return allocated_count


# ── Booking & Cancellation Integration ────────────────────────────────────────

def _get_period_number_for_session(subscription: ClientSubscription, session) -> int:
    """
    Computes the 28-day period number (1..13) for a given session event.
    Monthly subscriptions are always period 1.
    Yearly subscriptions evaluate elapsed days from subscription started_at to session date.
    """
    if not subscription or not subscription.started_at:
        return 1
    if subscription.billing_cycle != ClientSubscription.BillingCycle.YEARLY:
        return 1

    session_date = getattr(session, "date", None)
    if session_date:
        elapsed_days = (session_date - subscription.started_at.date()).days
    else:
        elapsed_days = (timezone.now() - subscription.started_at).days

    return min(13, max(1, (elapsed_days // DAYS_PER_CREDIT_PERIOD) + 1))


def record_session_credit_consumption(
    client: User,
    session,
    session_type: str = "PERSONAL",
) -> SubscriptionCreditLedger | None:
    """
    Integrates session booking with SubscriptionCreditLedger atomically.
    Deducts 1 credit from ClientProfile and writes a CONSUMED ledger record
    with the correct period_number (1..13).
    """
    if session_type not in VALID_SESSION_TYPES:
        raise ValueError(f"Invalid session type '{session_type}'. Must be one of {VALID_SESSION_TYPES}.")

    with transaction.atomic():
        profile = ClientProfile.objects.select_for_update().get(user=client)
        subscription = (
            ClientSubscription.objects
            .select_related("plan")
            .filter(client=client, payment_status=ClientSubscription.PaymentStatus.ACTIVE)
            .order_by("-started_at")
            .first()
        )

        if not subscription:
            subscription = ClientSubscription.objects.filter(client=client).order_by("-created_at").first()

        if not subscription:
            return None

        period_num = _get_period_number_for_session(subscription, session)

        if session_type == "PERSONAL":
            credit_type = SubscriptionCreditLedger.CreditType.PERSONAL_TRAINING
            balance_after = profile.session_credits
            idempotency_key = f"PT_BOOKING_CONSUME_{session.id}"
            reason = f"Booked Personal Training Session #{session.id} with {session.trainer.email}"
            personal_session = session
            group_session = None
        else:
            credit_type = SubscriptionCreditLedger.CreditType.GROUP_WORKOUT
            balance_after = profile.group_session_credits
            idempotency_key = f"GW_ATTEND_CONSUME_{session.id}_CLIENT_{client.id}"
            reason = f"Attended Group Workout Session #{session.id}"
            personal_session = None
            group_session = session

        ledger, created = SubscriptionCreditLedger.objects.get_or_create(
            idempotency_key=idempotency_key,
            defaults={
                "client": client,
                "subscription": subscription,
                "credit_type": credit_type,
                "action": SubscriptionCreditLedger.Action.CONSUMED,
                "amount": -1,
                "period_number": period_num,
                "personal_session": personal_session,
                "group_session": group_session,
                "balance_after": balance_after,
                "reason": reason,
            }
        )
        return ledger


def record_session_credit_restoration(
    client: User,
    session,
    session_type: str = "PERSONAL",
    reason: str = "",
) -> SubscriptionCreditLedger | None:
    """
    Integrates session cancellation with SubscriptionCreditLedger atomically.
    Restores 1 credit to ClientProfile and writes a RESTORED ledger record
    with the correct period_number (1..13).
    """
    if session_type not in VALID_SESSION_TYPES:
        raise ValueError(f"Invalid session type '{session_type}'. Must be one of {VALID_SESSION_TYPES}.")

    with transaction.atomic():
        profile = ClientProfile.objects.select_for_update().get(user=client)
        subscription = (
            ClientSubscription.objects
            .select_related("plan")
            .filter(client=client, payment_status=ClientSubscription.PaymentStatus.ACTIVE)
            .order_by("-started_at")
            .first()
        )

        if not subscription:
            subscription = ClientSubscription.objects.filter(client=client).order_by("-created_at").first()

        if not subscription:
            return None

        period_num = _get_period_number_for_session(subscription, session)

        if session_type == "PERSONAL":
            credit_type = SubscriptionCreditLedger.CreditType.PERSONAL_TRAINING
            balance_after = profile.session_credits
            idempotency_key = f"PT_CANCEL_RESTORE_{session.id}"
            default_reason = f"Cancelled Personal Training Session #{session.id}"
            personal_session = session
            group_session = None
        else:
            credit_type = SubscriptionCreditLedger.CreditType.GROUP_WORKOUT
            balance_after = profile.group_session_credits
            idempotency_key = f"GW_CANCEL_RESTORE_{session.id}_CLIENT_{client.id}"
            default_reason = f"Refunded Group Workout Session #{session.id}"
            personal_session = None
            group_session = session

        # Prevent duplicate restoration
        existing = SubscriptionCreditLedger.objects.filter(idempotency_key=idempotency_key).first()
        if existing:
            return existing

        ledger = SubscriptionCreditLedger.objects.create(
            client=client,
            subscription=subscription,
            credit_type=credit_type,
            action=SubscriptionCreditLedger.Action.RESTORED,
            amount=1,
            period_number=period_num,
            personal_session=personal_session,
            group_session=group_session,
            balance_after=balance_after,
            reason=reason or default_reason,
            idempotency_key=idempotency_key,
        )
        return ledger


# ── Trainer Wallet & Earning Triggers ────────────────────────────────────────

def get_or_create_trainer_wallet(trainer: User) -> TrainerWallet:
    wallet, _ = TrainerWallet.objects.get_or_create(
        trainer=trainer,
        defaults={
            "available_balance": Decimal("0.00"),
            "reserved_balance": Decimal("0.00"),
            "pending_earnings": Decimal("0.00"),
            "total_earned": Decimal("0.00"),
            "total_withdrawn": Decimal("0.00"),
        }
    )
    return wallet


def credit_trainer_earning_to_wallet(earning: TrainerEarning) -> WalletTransaction:
    """
    Credits a finalized TrainerEarning into the trainer's available wallet balance.
    Uses select_for_update() to atomically increment available_balance and total_earned.
    Transitions earning status from PENDING to AVAILABLE.
    Writes an immutable WalletTransaction audit record.
    """
    with transaction.atomic():
        wallet = TrainerWallet.objects.select_for_update().get(trainer=earning.trainer)
        earning = TrainerEarning.objects.select_for_update().get(id=earning.id)

        if earning.status == TrainerEarning.Status.AVAILABLE:
            existing = WalletTransaction.objects.filter(earning=earning).first()
            if existing:
                return existing

        amount = earning.trainer_amount
        wallet.available_balance += amount
        wallet.total_earned += amount
        wallet.save(update_fields=["available_balance", "total_earned", "updated_at"])

        earning.status = TrainerEarning.Status.AVAILABLE
        earning.save(update_fields=["status", "updated_at"])

        tx_key = f"WT_EARNING_{earning.id}"
        tx = WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type=WalletTransaction.TransactionType.CREDIT_EARNING,
            amount=amount,
            balance_after=wallet.available_balance,
            earning=earning,
            reference_id=str(earning.id),
            description=f"Session earning: ₹{amount} for {earning.get_earning_type_display()}",
            idempotency_key=tx_key,
        )
        return tx


def process_personal_session_completion(session) -> TrainerEarning:
    """
    Phase 3: Triggered when a Personal Training session is completed.
    Calculates 80% trainer share using actual amount paid on client's subscription
    that funded the consumed credit (audit source).
    Atomically credits the trainer's wallet.
    Idempotent: cannot credit twice for the same session.
    """
    with transaction.atomic():
        idempotency_key = f"PT_COMPLETE_EARNING_{session.id}"
        existing = TrainerEarning.objects.filter(idempotency_key=idempotency_key).first()
        if existing:
            return existing

        consumed_ledger = (
            SubscriptionCreditLedger.objects
            .filter(personal_session=session, action=SubscriptionCreditLedger.Action.CONSUMED)
            .select_related("subscription", "subscription__plan")
            .first()
        )
        if consumed_ledger and consumed_ledger.subscription:
            subscription = consumed_ledger.subscription
        else:
            subscription = (
                ClientSubscription.objects
                .select_related("plan")
                .filter(client=session.client, payment_status=ClientSubscription.PaymentStatus.ACTIVE)
                .order_by("-started_at")
                .first()
            )
            if not subscription:
                subscription = ClientSubscription.objects.filter(client=session.client).order_by("-created_at").first()

        gross_value = get_session_gross_value_from_subscription(subscription, session_type="PERSONAL")
        platform_fee, trainer_share, platform_rate, trainer_rate = calculate_session_commission(gross_value)

        wallet = get_or_create_trainer_wallet(session.trainer)

        earning = TrainerEarning.objects.create(
            trainer=session.trainer,
            earning_type=TrainerEarning.EarningType.PERSONAL_SESSION,
            status=TrainerEarning.Status.PENDING,
            personal_session=session,
            client=session.client,
            gross_amount=gross_value,
            platform_fee=platform_fee,
            trainer_amount=trainer_share,
            platform_commission_rate=platform_rate,
            trainer_commission_rate=trainer_rate,
            idempotency_key=idempotency_key,
            notes=f"Completed Personal Training Session #{session.id}",
        )

        credit_trainer_earning_to_wallet(earning)
        earning.refresh_from_db()
        return earning


def process_personal_session_late_cancellation(session) -> TrainerEarning:
    """
    Phase 3: Late cancellation by client (at or after scheduled session start).
    Client credit remains consumed (no restoration).
    Trainer receives 80% share for reserved time, based on exact subscription consumed.
    """
    with transaction.atomic():
        idempotency_key = f"PT_LATE_CANCEL_EARNING_{session.id}"
        existing = TrainerEarning.objects.filter(idempotency_key=idempotency_key).first()
        if existing:
            return existing

        consumed_ledger = (
            SubscriptionCreditLedger.objects
            .filter(personal_session=session, action=SubscriptionCreditLedger.Action.CONSUMED)
            .select_related("subscription", "subscription__plan")
            .first()
        )
        if consumed_ledger and consumed_ledger.subscription:
            subscription = consumed_ledger.subscription
        else:
            subscription = (
                ClientSubscription.objects
                .select_related("plan")
                .filter(client=session.client)
                .order_by("-started_at")
                .first()
            )
        gross_value = get_session_gross_value_from_subscription(subscription, session_type="PERSONAL")
        platform_fee, trainer_share, platform_rate, trainer_rate = calculate_session_commission(gross_value)

        wallet = get_or_create_trainer_wallet(session.trainer)

        earning = TrainerEarning.objects.create(
            trainer=session.trainer,
            earning_type=TrainerEarning.EarningType.PERSONAL_LATE_CANCELLATION,
            status=TrainerEarning.Status.PENDING,
            personal_session=session,
            client=session.client,
            gross_amount=gross_value,
            platform_fee=platform_fee,
            trainer_amount=trainer_share,
            platform_commission_rate=platform_rate,
            trainer_commission_rate=trainer_rate,
            idempotency_key=idempotency_key,
            notes=f"Client late cancellation for Personal Training Session #{session.id}",
        )

        credit_trainer_earning_to_wallet(earning)
        earning.refresh_from_db()
        return earning


def process_personal_session_no_show(session) -> TrainerEarning:
    """
    Phase 3: Client no-show for Personal Training session.
    Credit remains consumed.
    Trainer receives 80% share for reserved time, based on exact subscription consumed.
    """
    with transaction.atomic():
        idempotency_key = f"PT_NO_SHOW_EARNING_{session.id}"
        existing = TrainerEarning.objects.filter(idempotency_key=idempotency_key).first()
        if existing:
            return existing

        consumed_ledger = (
            SubscriptionCreditLedger.objects
            .filter(personal_session=session, action=SubscriptionCreditLedger.Action.CONSUMED)
            .select_related("subscription", "subscription__plan")
            .first()
        )
        if consumed_ledger and consumed_ledger.subscription:
            subscription = consumed_ledger.subscription
        else:
            subscription = (
                ClientSubscription.objects
                .select_related("plan")
                .filter(client=session.client)
                .order_by("-started_at")
                .first()
            )
        gross_value = get_session_gross_value_from_subscription(subscription, session_type="PERSONAL")
        platform_fee, trainer_share, platform_rate, trainer_rate = calculate_session_commission(gross_value)

        wallet = get_or_create_trainer_wallet(session.trainer)

        earning = TrainerEarning.objects.create(
            trainer=session.trainer,
            earning_type=TrainerEarning.EarningType.PERSONAL_NO_SHOW,
            status=TrainerEarning.Status.PENDING,
            personal_session=session,
            client=session.client,
            gross_amount=gross_value,
            platform_fee=platform_fee,
            trainer_amount=trainer_share,
            platform_commission_rate=platform_rate,
            trainer_commission_rate=trainer_rate,
            idempotency_key=idempotency_key,
            notes=f"Client no-show for Personal Training Session #{session.id}",
        )

        credit_trainer_earning_to_wallet(earning)
        earning.refresh_from_db()
        return earning


# ── Group Workout Completion & Alternative Batch Transfers ───────────────────

def create_alternative_batch_transfer(
    client: User,
    original_session,
    replacement_session,
    notes: str = "",
) -> AlternativeBatchTransfer:
    """
    Enforces BUSINESS DECISION 2: ALTERNATIVE GROUP BATCH TRANSFERS.
    Rules:
    1. Assigned trainer must match.
    2. Client must be actively booked into the original session.
    3. Replacement session must have available capacity (with atomic lock protection).
    4. Transfer must be completed strictly before original session starts.
    5. One original session entitlement can be transferred only once (active or conducted).
    6. If a previous transfer was cancelled, the client may select another replacement session.
    """
    from group_workouts.models import GroupWorkoutSession, GroupWorkoutParticipant

    with transaction.atomic():
        orig = GroupWorkoutSession.objects.select_for_update().get(id=original_session.id)
        repl = GroupWorkoutSession.objects.select_for_update().get(id=replacement_session.id)

        if orig.group_workout.trainer_id != repl.group_workout.trainer_id:
            raise ValueError("Alternative session must be conducted by the same assigned trainer.")

        # Verify client is actively booked in original session
        is_enrolled = GroupWorkoutParticipant.objects.filter(
            session=orig,
            client=client,
            status=GroupWorkoutParticipant.Status.JOINED,
        ).exists()
        if not is_enrolled:
            raise ValueError("Client is not booked into the original session.")

        now = timezone.now()
        original_start_dt = datetime.combine(orig.date, orig.start_time)
        if timezone.is_aware(now):
            original_start_dt = timezone.make_aware(original_start_dt, timezone.get_current_timezone())

        repl_start_dt = datetime.combine(repl.date, repl.start_time)
        if timezone.is_aware(now):
            repl_start_dt = timezone.make_aware(repl_start_dt, timezone.get_current_timezone())

        if now >= repl_start_dt:
            raise ValueError("The replacement session must be scheduled in the future.")

        if repl.status != GroupWorkoutSession.Status.SCHEDULED:
            raise ValueError("The replacement session must be actively scheduled.")

        # Check if client previously had a cancelled transfer for this session (retry scenario)
        has_cancelled_previous_transfer = AlternativeBatchTransfer.objects.filter(
            client=client,
            original_session=orig,
            status=AlternativeBatchTransfer.Status.CANCELLED,
        ).exists()

        if not has_cancelled_previous_transfer and now >= original_start_dt:
            raise ValueError("Initial transfer must be completed strictly before the original session starts.")

        # Check single active/conducted transfer per entitlement
        if AlternativeBatchTransfer.objects.filter(
            client=client,
            original_session=orig,
            status__in=[AlternativeBatchTransfer.Status.PENDING, AlternativeBatchTransfer.Status.CONDUCTED],
        ).exists():
            raise ValueError("An active or completed transfer already exists for this session entitlement.")

        # Concurrency-safe capacity check on replacement session
        joined_count = GroupWorkoutParticipant.objects.filter(
            session=repl,
            status=GroupWorkoutParticipant.Status.JOINED,
        ).count()
        pending_in = AlternativeBatchTransfer.objects.filter(
            replacement_session=repl,
            status=AlternativeBatchTransfer.Status.PENDING,
        ).count()
        transferred_out = AlternativeBatchTransfer.objects.filter(
            original_session=repl,
            status=AlternativeBatchTransfer.Status.PENDING,
        ).count()
        occupied_capacity = joined_count + pending_in - transferred_out

        if occupied_capacity >= repl.group_workout.capacity:
            raise ValueError("The replacement session has reached its full capacity.")

        transfer = AlternativeBatchTransfer.objects.create(
            client=client,
            trainer=orig.group_workout.trainer,
            original_session=orig,
            replacement_session=repl,
            status=AlternativeBatchTransfer.Status.PENDING,
            notes=notes,
        )
        return transfer


def process_group_session_completion(session) -> TrainerEarning | None:
    """
    Phase 3: Group Workout Session completion.
    Rules:
    1. Deduct one credit for every eligible client entitlement.
    2. Absent clients also consume one credit.
    3. Transferred-out clients are skipped (no deduction, no earning in original session).
    4. Transferred-in clients have their transfer marked CONDUCTED and consume 1 credit.
    5. Trainer earning is ONLY generated from clients whose credits were ACTUALLY deducted.
    6. Idempotent per group session.
    """
    from group_workouts.models import GroupWorkoutParticipant

    with transaction.atomic():
        idempotency_key = f"GW_EARNING_COMPLETED_{session.id}"
        existing = TrainerEarning.objects.filter(idempotency_key=idempotency_key).first()
        if existing:
            return existing

        trainer = session.group_workout.trainer
        total_session_gross = Decimal("0.00")
        processed_clients = set()
        deducted_entitlement_count = 0

        # 1. Regular participants booked for this session
        participants = GroupWorkoutParticipant.objects.select_for_update().filter(
            session=session,
            status=GroupWorkoutParticipant.Status.JOINED,
        )

        for part in participants:
            client = part.client

            # Check if this client transferred OUT to an alternative session
            transferred_out = AlternativeBatchTransfer.objects.filter(
                original_session=session,
                client=client,
                status=AlternativeBatchTransfer.Status.PENDING,
            ).exists()

            if transferred_out:
                logger.info(f"Client {client.email} transferred out from Session #{session.id}. Skipping deduction.")
                continue

            processed_clients.add(client.id)

            # On-demand allocation check before verifying balance
            check_and_allocate_period_credits(client)

            profile = ClientProfile.objects.select_for_update().get(user=client)
            credit_deducted = False
            if profile.group_session_credits > 0:
                profile.group_session_credits -= 1
                profile.save(update_fields=["group_session_credits"])
                ledger = record_session_credit_consumption(client=client, session=session, session_type="GROUP")
                credit_deducted = True
                deducted_entitlement_count += 1

            # Trainer earns ONLY if credit was actually deducted
            if credit_deducted:
                sub = ledger.subscription if ledger else None
                if not sub:
                    sub = (
                        ClientSubscription.objects
                        .select_related("plan")
                        .filter(client=client, payment_status=ClientSubscription.PaymentStatus.ACTIVE)
                        .order_by("-started_at")
                        .first()
                    )
                if not sub:
                    sub = ClientSubscription.objects.filter(client=client).order_by("-created_at").first()

                if sub:
                    client_gross = get_session_gross_value_from_subscription(sub, session_type="GROUP")
                    total_session_gross += client_gross

        # 2. Transferred-IN participants attending this replacement session
        transfers_in = AlternativeBatchTransfer.objects.select_for_update().filter(
            replacement_session=session,
            status=AlternativeBatchTransfer.Status.PENDING,
        )

        for transfer in transfers_in:
            client = transfer.client
            if client.id in processed_clients:
                continue

            processed_clients.add(client.id)

            # On-demand allocation check
            check_and_allocate_period_credits(client)

            profile = ClientProfile.objects.select_for_update().get(user=client)
            credit_deducted = False
            if profile.group_session_credits > 0:
                profile.group_session_credits -= 1
                profile.save(update_fields=["group_session_credits"])
                ledger = record_session_credit_consumption(client=client, session=session, session_type="GROUP")
                credit_deducted = True
                deducted_entitlement_count += 1

                # Mark transfer as conducted
                transfer.status = AlternativeBatchTransfer.Status.CONDUCTED
                transfer.consumed_at = timezone.now()
                transfer.save(update_fields=["status", "consumed_at"])

            if credit_deducted:
                sub = ledger.subscription if ledger else None
                if not sub:
                    sub = (
                        ClientSubscription.objects
                        .select_related("plan")
                        .filter(client=client)
                        .order_by("-started_at")
                        .first()
                    )
                if sub:
                    client_gross = get_session_gross_value_from_subscription(sub, session_type="GROUP")
                    total_session_gross += client_gross

        if total_session_gross <= Decimal("0.00") or deducted_entitlement_count == 0:
            return None

        platform_fee, trainer_share, platform_rate, trainer_rate = calculate_session_commission(total_session_gross)
        wallet = get_or_create_trainer_wallet(trainer)

        earning = TrainerEarning.objects.create(
            trainer=trainer,
            earning_type=TrainerEarning.EarningType.GROUP_SESSION,
            status=TrainerEarning.Status.PENDING,
            group_session=session,
            gross_amount=total_session_gross,
            platform_fee=platform_fee,
            trainer_amount=trainer_share,
            platform_commission_rate=platform_rate,
            trainer_commission_rate=trainer_rate,
            idempotency_key=idempotency_key,
            notes=f"Completed Group Workout Session #{session.id} with {deducted_entitlement_count} paid entitlements",
        )

        credit_trainer_earning_to_wallet(earning)
        earning.refresh_from_db()
        return earning


def handle_group_session_cancellation(session):
    """
    Phase 3: Trainer cancels a group session.
    Rules:
    - Never deduct client credits.
    - If client transferred into this replacement session, preserve their entitlement for another opportunity.
    """
    with transaction.atomic():
        transfers_in = AlternativeBatchTransfer.objects.filter(
            replacement_session=session,
            status=AlternativeBatchTransfer.Status.PENDING,
        )
        for transfer in transfers_in:
            transfer.status = AlternativeBatchTransfer.Status.CANCELLED
            transfer.notes += " Replacement session cancelled by trainer; entitlement preserved."
            transfer.save(update_fields=["status", "notes"])


# ── Phase 5: Payout Management Services ──────────────────────────────────────

def request_trainer_payout(trainer: User, amount: Decimal) -> TrainerPayout:
    """
    Trainer requests a payout withdrawal.
    Uses select_for_update() to atomically check available balance,
    decrement available_balance, and increment reserved_balance.
    """
    with transaction.atomic():
        amount = Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if amount < Decimal("1.00"):
            raise ValueError("Minimum payout request amount is ₹1.00.")

        wallet = TrainerWallet.objects.select_for_update().get(trainer=trainer)

        if wallet.available_balance < amount:
            raise ValueError(
                f"Insufficient available balance. Requested: ₹{amount}, Available: ₹{wallet.available_balance}"
            )

        wallet.available_balance -= amount
        wallet.reserved_balance += amount
        wallet.save(update_fields=["available_balance", "reserved_balance", "updated_at"])

        payout = TrainerPayout.objects.create(
            trainer=trainer,
            wallet=wallet,
            amount=amount,
            status=TrainerPayout.Status.REQUESTED,
        )

        WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type=WalletTransaction.TransactionType.RESERVE_PAYOUT,
            amount=amount,
            balance_after=wallet.available_balance,
            payout=payout,
            reference_id=f"PAYOUT_REQ_{payout.id}",
            description=f"Reserved ₹{amount} for payout request #{payout.id}",
            idempotency_key=f"WT_PAYOUT_RESERVE_{payout.id}",
        )
        return payout


def process_payout_by_admin(payout_id: int, admin_user: User, admin_notes: str = "") -> TrainerPayout:
    """
    Admin moves payout from REQUESTED to PROCESSING.
    """
    with transaction.atomic():
        payout = TrainerPayout.objects.select_for_update().get(id=payout_id)
        if payout.status != TrainerPayout.Status.REQUESTED:
            raise ValueError(f"Cannot process payout in status '{payout.status}'.")

        payout.status = TrainerPayout.Status.PROCESSING
        if admin_notes:
            payout.admin_notes = admin_notes
        payout.processed_by = admin_user
        payout.save(update_fields=["status", "admin_notes", "processed_by"])
        return payout


def confirm_payout_by_admin(
    payout_id: int,
    admin_user: User,
    payment_reference: str,
    admin_notes: str = "",
) -> TrainerPayout:
    """
    Admin confirms successful payout transfer after bank/UTR verification.
    Requires verified payment_reference.
    Atomically decrements reserved_balance, increments total_withdrawn,
    and writes an immutable WalletTransaction (DEBIT_PAYOUT).
    """
    if not payment_reference or not payment_reference.strip():
        raise ValueError("Payment reference (UTR / transaction reference) is required to confirm payout.")

    with transaction.atomic():
        payout = TrainerPayout.objects.select_for_update().get(id=payout_id)
        if payout.status not in [TrainerPayout.Status.REQUESTED, TrainerPayout.Status.PROCESSING]:
            raise ValueError(f"Cannot confirm payout in status '{payout.status}'.")

        wallet = TrainerWallet.objects.select_for_update().get(id=payout.wallet.id)

        if wallet.reserved_balance < payout.amount:
            raise ValueError(
                f"Reserved balance (₹{wallet.reserved_balance}) is less than payout amount (₹{payout.amount}). Cannot confirm payout due to balance inconsistency."
            )

        wallet.reserved_balance -= payout.amount
        wallet.total_withdrawn += payout.amount
        wallet.save(update_fields=["reserved_balance", "total_withdrawn", "updated_at"])

        payout.status = TrainerPayout.Status.COMPLETED
        payout.payment_reference = payment_reference.strip()
        payout.processed_by = admin_user
        payout.processed_at = timezone.now()
        if admin_notes:
            payout.admin_notes = admin_notes
        payout.save(update_fields=["status", "payment_reference", "processed_by", "processed_at", "admin_notes"])

        tx_key = f"WT_PAYOUT_CONFIRM_{payout.id}"
        WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type=WalletTransaction.TransactionType.DEBIT_PAYOUT,
            amount=payout.amount,
            balance_after=wallet.available_balance,
            payout=payout,
            reference_id=payment_reference.strip(),
            description=f"Payout withdrawal completed (Ref: {payment_reference.strip()})",
            idempotency_key=tx_key,
        )
        return payout


def reject_payout_by_admin(
    payout_id: int,
    admin_user: User,
    failure_reason: str,
    admin_notes: str = "",
) -> TrainerPayout:
    """
    Admin rejects payout request.
    Rolls back reserved funds back to available_balance atomically.
    Rejects operation if reserved balance is less than payout amount.
    """
    if not failure_reason or not failure_reason.strip():
        raise ValueError("A reason is required to reject a payout.")

    with transaction.atomic():
        payout = TrainerPayout.objects.select_for_update().get(id=payout_id)
        if payout.status not in [TrainerPayout.Status.REQUESTED, TrainerPayout.Status.PROCESSING]:
            raise ValueError(f"Cannot reject payout in status '{payout.status}'.")

        wallet = TrainerWallet.objects.select_for_update().get(id=payout.wallet.id)

        if wallet.reserved_balance < payout.amount:
            raise ValueError(
                f"Reserved balance (₹{wallet.reserved_balance}) is less than payout amount (₹{payout.amount}). Cannot reject payout due to balance inconsistency."
            )

        wallet.reserved_balance -= payout.amount
        wallet.available_balance += payout.amount
        wallet.save(update_fields=["reserved_balance", "available_balance", "updated_at"])

        payout.status = TrainerPayout.Status.REJECTED
        payout.failure_reason = failure_reason.strip()
        payout.processed_by = admin_user
        payout.processed_at = timezone.now()
        if admin_notes:
            payout.admin_notes = admin_notes
        payout.save(update_fields=["status", "failure_reason", "processed_by", "processed_at", "admin_notes"])

        WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type=WalletTransaction.TransactionType.RELEASE_PAYOUT,
            amount=payout.amount,
            balance_after=wallet.available_balance,
            payout=payout,
            reference_id=f"PAYOUT_REJ_{payout.id}",
            description=f"Released reserved ₹{payout.amount} following payout rejection: {failure_reason.strip()}",
            idempotency_key=f"WT_PAYOUT_RELEASE_{payout.id}",
        )
        return payout


def fail_payout_by_admin(
    payout_id: int,
    admin_user: User,
    failure_reason: str,
    admin_notes: str = "",
) -> TrainerPayout:
    """
    Marks a processing payout as failed due to gateway/banking rejection.
    Rolls back reserved funds back to available_balance atomically.
    Rejects operation if reserved balance is less than payout amount.
    """
    if not failure_reason or not failure_reason.strip():
        raise ValueError("A failure reason is required.")

    with transaction.atomic():
        payout = TrainerPayout.objects.select_for_update().get(id=payout_id)
        if payout.status not in [TrainerPayout.Status.REQUESTED, TrainerPayout.Status.PROCESSING]:
            raise ValueError(f"Cannot fail payout in status '{payout.status}'.")

        wallet = TrainerWallet.objects.select_for_update().get(id=payout.wallet.id)

        if wallet.reserved_balance < payout.amount:
            raise ValueError(
                f"Reserved balance (₹{wallet.reserved_balance}) is less than payout amount (₹{payout.amount}). Cannot fail payout due to balance inconsistency."
            )

        wallet.reserved_balance -= payout.amount
        wallet.available_balance += payout.amount
        wallet.save(update_fields=["reserved_balance", "available_balance", "updated_at"])

        payout.status = TrainerPayout.Status.FAILED
        payout.failure_reason = failure_reason.strip()
        payout.processed_by = admin_user
        payout.processed_at = timezone.now()
        if admin_notes:
            payout.admin_notes = admin_notes
        payout.save(update_fields=["status", "failure_reason", "processed_by", "processed_at", "admin_notes"])

        WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type=WalletTransaction.TransactionType.RELEASE_PAYOUT,
            amount=payout.amount,
            balance_after=wallet.available_balance,
            payout=payout,
            reference_id=f"PAYOUT_FAIL_{payout.id}",
            description=f"Released reserved ₹{payout.amount} following payout failure: {failure_reason.strip()}",
            idempotency_key=f"WT_PAYOUT_RELEASE_FAIL_{payout.id}",
        )
        return payout
