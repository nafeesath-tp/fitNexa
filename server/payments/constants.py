"""
Module 19: Financial & Commission Constants & Calculators
"""
from decimal import Decimal, ROUND_HALF_UP
from django.conf import settings

DEFAULT_PLATFORM_COMMISSION_PERCENTAGE = Decimal("20.00")
DEFAULT_TRAINER_COMMISSION_PERCENTAGE = Decimal("80.00")

# Package durations in days
MONTHLY_PACKAGE_DAYS = 28
YEARLY_PACKAGE_DAYS = 364
YEARLY_PERIOD_COUNT = 13
DAYS_PER_CREDIT_PERIOD = 28

# Credits per 28-day period
PERSONAL_TRAINING_PERIOD_CREDITS = 12
GROUP_WORKOUT_PERIOD_CREDITS = 16

VALID_SESSION_TYPES = ("PERSONAL", "GROUP")

# Standard currency conversion: 1 USD = 84.00 INR
DEFAULT_USD_TO_INR_EXCHANGE_RATE = Decimal("84.00")


def convert_to_inr(amount: Decimal, currency: str = "USD") -> Decimal:
    """
    Converts foreign currency amounts (e.g. USD from Stripe) to Indian Rupees (INR)
    using the configured platform exchange rate.
    If currency is already INR, returns the amount unchanged.
    """
    if not amount:
        return Decimal("0.00")
    amount_dec = Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    curr = (currency or "INR").upper()
    if curr in ("USD", "$"):
        rate = Decimal(str(getattr(settings, "USD_TO_INR_EXCHANGE_RATE", DEFAULT_USD_TO_INR_EXCHANGE_RATE)))
        return (amount_dec * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return amount_dec


def get_commission_rates():
    """
    Returns (platform_percentage, trainer_percentage) as Decimals.
    Validates that:
    1. Both rates are between 0.00% and 100.00%.
    2. Both rates strictly sum to 100.00%.
    """
    platform = Decimal(str(getattr(settings, "PLATFORM_COMMISSION_PERCENTAGE", DEFAULT_PLATFORM_COMMISSION_PERCENTAGE))).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    trainer = Decimal(str(getattr(settings, "TRAINER_COMMISSION_PERCENTAGE", DEFAULT_TRAINER_COMMISSION_PERCENTAGE))).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )

    if not (Decimal("0.00") <= platform <= Decimal("100.00")):
        raise ValueError(f"Platform commission rate must be between 0.00% and 100.00%. Got {platform}%")

    if not (Decimal("0.00") <= trainer <= Decimal("100.00")):
        raise ValueError(f"Trainer commission rate must be between 0.00% and 100.00%. Got {trainer}%")

    if platform + trainer != Decimal("100.00"):
        raise ValueError(
            f"Commission percentages must total 100.00%. Configured: Platform={platform}%, Trainer={trainer}%"
        )
    return platform, trainer


def calculate_session_commission(gross_amount: Decimal):
    """
    Splits gross_amount into (platform_fee, trainer_share) using Decimal precision and ROUND_HALF_UP.
    Guarantees:
    - gross_amount cannot be negative.
    - platform_fee + trainer_share == gross_amount
    """
    gross_amount = Decimal(str(gross_amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if gross_amount < Decimal("0.00"):
        raise ValueError(f"Gross amount cannot be negative. Got {gross_amount}")

    platform_rate, trainer_rate = get_commission_rates()

    platform_fee = (gross_amount * (platform_rate / Decimal("100.00"))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    trainer_share = gross_amount - platform_fee

    return platform_fee, trainer_share, platform_rate, trainer_rate


def calculate_personal_session_gross_value(package_price: Decimal) -> Decimal:
    """
    Personal Training: package_price divided by 12 credits.
    """
    package_price = Decimal(str(package_price)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if package_price < Decimal("0.00"):
        raise ValueError(f"Package price cannot be negative. Got {package_price}")

    return (package_price / Decimal(str(PERSONAL_TRAINING_PERIOD_CREDITS))).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )


def calculate_group_session_gross_value(package_price: Decimal) -> Decimal:
    """
    Group Workout: package_price divided by 16 credits per client.
    """
    package_price = Decimal(str(package_price)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if package_price < Decimal("0.00"):
        raise ValueError(f"Package price cannot be negative. Got {package_price}")

    return (package_price / Decimal(str(GROUP_WORKOUT_PERIOD_CREDITS))).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )


def get_session_gross_value_from_subscription(subscription, session_type: str = "PERSONAL") -> Decimal:
    """
    Calculates the exact per-session gross value using the client's ACTUAL amount_paid
    (which factors in proration, discounts, etc.) rather than the catalogue plan price.

    Validation:
    - session_type must be 'PERSONAL' or 'GROUP'
    - billing_cycle must be valid ('MONTHLY' or 'YEARLY')
    - amount_paid cannot be negative
    """
    if session_type not in VALID_SESSION_TYPES:
        raise ValueError(f"Invalid session type '{session_type}'. Must be one of {VALID_SESSION_TYPES}.")

    billing_cycle = getattr(subscription, "billing_cycle", None)
    from subscriptions.models import ClientSubscription
    if billing_cycle not in ClientSubscription.BillingCycle.values:
        raise ValueError(
            f"Invalid billing cycle '{billing_cycle}'. Must be one of {ClientSubscription.BillingCycle.values}."
        )

    amount_paid = Decimal(str(subscription.amount_paid)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if amount_paid < Decimal("0.00"):
        raise ValueError(f"Subscription amount_paid cannot be negative. Got {amount_paid}")

    is_yearly = (billing_cycle == ClientSubscription.BillingCycle.YEARLY)
    period_amount = (amount_paid / Decimal("13.00")) if is_yearly else amount_paid

    if session_type == "PERSONAL":
        return (period_amount / Decimal(str(PERSONAL_TRAINING_PERIOD_CREDITS))).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
    else:
        return (period_amount / Decimal(str(GROUP_WORKOUT_PERIOD_CREDITS))).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
