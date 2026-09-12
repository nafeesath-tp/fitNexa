from django.db import models
from django.conf import settings
from django.utils import timezone


class SubscriptionPlan(models.Model):
    """
    The three tiers FitNexa offers: FREE, GROUP, PREMIUM.

    features is a JSON list of human-readable feature labels, e.g.
        ["Access Basic Training Videos", "Browse Trainers"]

    Using JSONField instead of M2M keeps serialisers simple, avoids extra
    joins, and makes frontend rendering trivial — just map over the list.
    """

    class PlanName(models.TextChoices):
        GROUP   = "GROUP",   "Group"
        PREMIUM = "PREMIUM", "Premium"

    name = models.CharField(
        max_length=20,
        choices=PlanName.choices,
        unique=True,
    )

    price_monthly = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
        help_text="Monthly price in INR (0 = free)",
    )

    price_yearly = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
        help_text="Yearly price in INR (0 = free)",
    )

    features = models.JSONField(
        default=list,
        help_text='List of feature strings, e.g. ["Basic Videos", "Browse Trainers"]',
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Inactive plans are hidden from clients but existing subscriptions continue.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["price_monthly"]
        verbose_name = "Subscription Plan"
        verbose_name_plural = "Subscription Plans"

    def __str__(self):
        return f"{self.name} (₹{self.price_monthly}/mo)"


class ClientSubscription(models.Model):
    """
    Records every subscription a CLIENT purchases.

    Payment flow (Razorpay-ready):
        1.  Client hits Purchase → record created with payment_status=PENDING
        2.  Client completes payment → Razorpay webhook fires
                                     → payment_status=ACTIVE, started_at/expires_at set
        3.  (For now, a simulated confirm endpoint moves PENDING → ACTIVE)

    auto_renew: stored now so the Renew button can later become Auto-Renew
                without a DB migration.
    """

    class PaymentStatus(models.TextChoices):
        PENDING   = "PENDING",   "Pending"
        ACTIVE    = "ACTIVE",    "Active"
        FAILED    = "FAILED",    "Failed"
        CANCELLED = "CANCELLED", "Cancelled"
        EXPIRED   = "EXPIRED",   "Expired"

    class BillingCycle(models.TextChoices):
        MONTHLY = "MONTHLY", "Monthly"
        YEARLY  = "YEARLY",  "Yearly"

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscriptions",
        limit_choices_to={"role": "CLIENT"},
    )

    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name="subscriptions",
    )

    billing_cycle = models.CharField(
        max_length=10,
        choices=BillingCycle.choices,
        default=BillingCycle.MONTHLY,
    )

    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )

    auto_renew = models.BooleanField(
        default=False,
        help_text="When True, the subscription renews automatically on expiry.",
    )

    amount_paid = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
        help_text="Actual amount collected at checkout (post-discount, etc.)",
    )

    stripe_session_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="The Stripe Checkout session ID used to track payment.",
    )

    # These are set when payment is confirmed (status → ACTIVE)
    started_at  = models.DateTimeField(null=True, blank=True)
    expires_at  = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Client Subscription"
        verbose_name_plural = "Client Subscriptions"

    def __str__(self):
        return f"{self.client.email} → {self.plan.name} [{self.payment_status}]"

    @property
    def is_currently_active(self):
        """True when payment is confirmed and subscription hasn't expired."""
        if self.payment_status != self.PaymentStatus.ACTIVE:
            return False
        if self.expires_at and self.expires_at < timezone.now():
            return False
        return True
