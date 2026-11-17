from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError

User = settings.AUTH_USER_MODEL


class PaymentTransaction(models.Model):
    """
    Unified financial audit record for all client payments and refunds.
    Tracks incoming gateway checkouts, successful charges, upgrades, and cancellations.
    """
    class Status(models.TextChoices):
        PENDING   = "PENDING",   "Pending"
        SUCCESS   = "SUCCESS",   "Success"
        FAILED    = "FAILED",    "Failed"
        REFUNDED  = "REFUNDED",  "Refunded"

    class TransactionType(models.TextChoices):
        SUBSCRIPTION_PURCHASE = "SUBSCRIPTION_PURCHASE", "Subscription Purchase"
        SUBSCRIPTION_UPGRADE  = "SUBSCRIPTION_UPGRADE",  "Subscription Upgrade"
        SUBSCRIPTION_RENEWAL  = "SUBSCRIPTION_RENEWAL",  "Subscription Renewal"
        REFUND                = "REFUND",                "Refund"

    client = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="payment_transactions",
        limit_choices_to={"role": "CLIENT"},
    )
    subscription = models.ForeignKey(
        "subscriptions.ClientSubscription",
        on_delete=models.PROTECT,
        related_name="payment_transactions",
    )
    transaction_type = models.CharField(
        max_length=30,
        choices=TransactionType.choices,
        default=TransactionType.SUBSCRIPTION_PURCHASE,
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Amount in INR",
    )
    currency = models.CharField(max_length=10, default="INR")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    payment_gateway = models.CharField(max_length=50, default="STRIPE")
    stripe_session_id = models.CharField(max_length=255, blank=True, db_index=True)
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True)
    idempotency_key = models.CharField(max_length=255, unique=True, null=True, blank=True)
    raw_response = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Payment Transaction"
        verbose_name_plural = "Payment Transactions"

    def __str__(self):
        return f"Payment #{self.id} | {self.client.email} | {self.amount} {self.currency} [{self.status}]"


class SubscriptionCreditLedger(models.Model):
    """
    Auditable ledger for subscription-linked session credits.
    Tracks credit grants, deductions, refunds, cancellations, and expirations,
    preventing duplicate grants from repeated webhook calls.
    """
    class CreditType(models.TextChoices):
        PERSONAL_TRAINING = "PERSONAL_TRAINING", "Personal Training"
        GROUP_WORKOUT     = "GROUP_WORKOUT",     "Group Workout"

    class Action(models.TextChoices):
        ALLOCATED = "ALLOCATED", "Allocated"
        CONSUMED  = "CONSUMED",  "Consumed"
        RESTORED  = "RESTORED",  "Restored"
        EXPIRED   = "EXPIRED",   "Expired"

    client = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="credit_ledgers",
        limit_choices_to={"role": "CLIENT"},
    )
    subscription = models.ForeignKey(
        "subscriptions.ClientSubscription",
        on_delete=models.PROTECT,
        related_name="credit_ledgers",
    )
    credit_type = models.CharField(max_length=20, choices=CreditType.choices)
    action = models.CharField(max_length=20, choices=Action.choices)
    amount = models.IntegerField(help_text="Positive for allocation/restoration, negative for consumption/expiry")
    period_number = models.PositiveIntegerField(
        default=1,
        help_text="1 for monthly (28 days); 1 to 13 for yearly periods",
    )
    personal_session = models.ForeignKey(
        "scheduling.PersonalTrainingSession",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="credit_ledgers",
    )
    group_session = models.ForeignKey(
        "group_workouts.GroupWorkoutSession",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="credit_ledgers",
    )
    balance_after = models.IntegerField(validators=[MinValueValidator(0)])
    reason = models.CharField(max_length=255)
    idempotency_key = models.CharField(max_length=255, unique=True, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Subscription Credit Ledger"
        verbose_name_plural = "Subscription Credit Ledgers"
        constraints = [
            models.CheckConstraint(
                condition=(
                    (models.Q(action__in=["ALLOCATED", "RESTORED"]) & models.Q(amount__gt=0)) |
                    (models.Q(action__in=["CONSUMED", "EXPIRED"]) & models.Q(amount__lt=0))
                ),
                name="check_credit_ledger_action_sign",
            ),
            models.CheckConstraint(
                condition=models.Q(period_number__gte=1) & models.Q(period_number__lte=13),
                name="check_credit_ledger_period_number_range",
            ),
        ]

    def clean(self):
        super().clean()
        if self.action in [self.Action.ALLOCATED, self.Action.RESTORED] and self.amount <= 0:
            raise ValidationError(f"Amount for action '{self.action}' must be strictly positive (got {self.amount}).")
        if self.action in [self.Action.CONSUMED, self.Action.EXPIRED] and self.amount >= 0:
            raise ValidationError(f"Amount for action '{self.action}' must be strictly negative (got {self.amount}).")
        if not (1 <= self.period_number <= 13):
            raise ValidationError(f"Period number must be between 1 and 13 (got {self.period_number}).")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.client.email} | {self.credit_type} {self.action} ({self.amount}) -> Bal: {self.balance_after}"


class TrainerWallet(models.Model):
    """
    The financial ledger balance for an approved Trainer.
    Updated atomically whenever sessions are completed or payouts are processed.
    Preserved when trainer accounts are deactivated or deletion is attempted.
    """
    trainer = models.OneToOneField(
        User,
        on_delete=models.PROTECT,
        related_name="wallet",
        limit_choices_to={"role": "TRAINER"},
    )
    available_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Funds immediately available for payout requests",
    )
    reserved_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Funds reserved for pending payout requests",
    )
    pending_earnings = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Earnings held pending dispute or settlement window",
    )
    total_earned = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Cumulative lifetime earnings credited to trainer",
    )
    total_withdrawn = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Cumulative lifetime payouts successfully transferred",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Trainer Wallet"
        verbose_name_plural = "Trainer Wallets"

    def __str__(self):
        return f"Wallet ({self.trainer.email}) | Available: ₹{self.available_balance} | Reserved: ₹{self.reserved_balance}"


class TrainerEarning(models.Model):
    """
    Individual earning line item generated when a session is completed
    or when late cancellation / client no-show rules apply.
    Default status is PENDING.
    """
    class EarningType(models.TextChoices):
        PERSONAL_SESSION            = "PERSONAL_SESSION",            "Personal Training Session"
        GROUP_SESSION               = "GROUP_SESSION",               "Group Workout Session"
        PERSONAL_LATE_CANCELLATION  = "PERSONAL_LATE_CANCELLATION",  "Personal Session Late Cancellation"
        PERSONAL_NO_SHOW            = "PERSONAL_NO_SHOW",            "Personal Session Client No-Show"

    class Status(models.TextChoices):
        PENDING   = "PENDING",   "Pending"
        AVAILABLE = "AVAILABLE", "Available"
        PAID      = "PAID",      "Paid in Payout"
        CANCELLED = "CANCELLED", "Cancelled"

    trainer = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="earnings",
        limit_choices_to={"role": "TRAINER"},
    )
    earning_type = models.CharField(max_length=35, choices=EarningType.choices)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    personal_session = models.ForeignKey(
        "scheduling.PersonalTrainingSession",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="earnings",
    )
    group_session = models.ForeignKey(
        "group_workouts.GroupWorkoutSession",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="earnings",
    )
    client = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="trainer_earnings_generated",
        limit_choices_to={"role": "CLIENT"},
    )

    gross_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Total chargeable session value in INR",
    )
    platform_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Platform commission (e.g. 20%) in INR",
    )
    trainer_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Net trainer earning (e.g. 80%) in INR",
    )
    platform_commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("20.00"),
        validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))],
        help_text="Platform percentage snapshot",
    )
    trainer_commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("80.00"),
        validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))],
        help_text="Trainer percentage snapshot",
    )

    idempotency_key = models.CharField(
        max_length=255,
        unique=True,
        null=True,
        blank=True,
        help_text="Prevents duplicate earnings for the same session event",
    )
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Trainer Earning"
        verbose_name_plural = "Trainer Earnings"

    def __str__(self):
        return f"Earning #{self.id} | {self.trainer.email} | ₹{self.trainer_amount} [{self.earning_type}] ({self.status})"


class TrainerPayout(models.Model):
    """
    Payout withdrawal request initiated by a Trainer and audited/fulfilled by an Admin.
    """
    class Status(models.TextChoices):
        REQUESTED  = "REQUESTED",  "Requested"
        PROCESSING = "PROCESSING", "Processing"
        COMPLETED  = "COMPLETED",  "Completed"
        REJECTED   = "REJECTED",   "Rejected"
        FAILED     = "FAILED",     "Failed"

    trainer = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="payout_requests",
        limit_choices_to={"role": "TRAINER"},
    )
    wallet = models.ForeignKey(
        TrainerWallet,
        on_delete=models.PROTECT,
        related_name="payouts",
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("1.00"))],
        help_text="Requested payout amount in INR",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.REQUESTED,
        db_index=True,
    )
    payment_reference = models.CharField(
        max_length=255,
        blank=True,
        help_text="Bank transaction reference, UTR number, or Stripe Payout ID",
    )
    failure_reason = models.TextField(blank=True)
    admin_notes = models.TextField(blank=True)
    processed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="processed_payouts",
        limit_choices_to={"role": "ADMIN"},
    )

    requested_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-requested_at"]
        verbose_name = "Trainer Payout Request"
        verbose_name_plural = "Trainer Payout Requests"

    def __str__(self):
        return f"Payout #{self.id} | {self.trainer.email} | ₹{self.amount} [{self.status}]"


class WalletTransactionQuerySet(models.QuerySet):
    """
    Custom QuerySet to enforce immutability against bulk updates and bulk deletions.
    """
    def update(self, **kwargs):
        raise ValidationError("WalletTransaction records are an immutable financial ledger and cannot be bulk updated.")

    def delete(self):
        raise ValidationError("WalletTransaction records are an immutable financial ledger and cannot be bulk deleted.")


class WalletTransactionManager(models.Manager):
    def get_queryset(self):
        return WalletTransactionQuerySet(self.model, using=self._db)


class WalletTransaction(models.Model):
    """
    Immutable financial audit ledger for all balance changes to a Trainer's Wallet.
    Protected at QuerySet, Model, and Admin levels against edits and deletions.
    """
    class TransactionType(models.TextChoices):
        CREDIT_EARNING     = "CREDIT_EARNING",     "Session Earning Credit"
        RESERVE_PAYOUT     = "RESERVE_PAYOUT",     "Payout Reservation"
        RELEASE_PAYOUT     = "RELEASE_PAYOUT",     "Payout Reservation Released"
        DEBIT_PAYOUT       = "DEBIT_PAYOUT",       "Payout Withdrawal Debit"
        REFUND_ADJUSTMENT  = "REFUND_ADJUSTMENT",  "Refund Adjustment"

    wallet = models.ForeignKey(
        TrainerWallet,
        on_delete=models.PROTECT,
        related_name="transactions",
    )
    transaction_type = models.CharField(max_length=30, choices=TransactionType.choices)
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    balance_after = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    earning = models.ForeignKey(
        TrainerEarning,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="wallet_transactions",
    )
    payout = models.ForeignKey(
        TrainerPayout,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="wallet_transactions",
    )
    reference_id = models.CharField(max_length=255, blank=True)
    description = models.CharField(max_length=255)
    idempotency_key = models.CharField(
        max_length=255,
        unique=True,
        null=True,
        blank=True,
        help_text="Prevents duplicate wallet transaction ledger entries",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    objects = WalletTransactionManager()

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Wallet Transaction"
        verbose_name_plural = "Wallet Transactions"

    def save(self, *args, **kwargs):
        if self.pk and not kwargs.get("force_insert", False):
            raise ValidationError("WalletTransaction records are an immutable financial audit ledger and cannot be modified.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("WalletTransaction records are an immutable financial audit ledger and cannot be deleted.")

    def __str__(self):
        return f"WalletTx #{self.id} | {self.transaction_type} (₹{self.amount}) -> Bal: ₹{self.balance_after}"


class AlternativeBatchTransfer(models.Model):
    """
    Dedicated record for an alternative group batch transfer.
    A client in a regular batch can transfer their session entitlement to an alternative session
    created by the same assigned trainer without permanent batch reassignment.
    Guarantees:
    - Entitlement transferred max once per original session.
    - Original session does not deduct credit or credit trainer.
    - Replacement session consumes entitlement once when conducted (including absence).
    - Trainer conducting replacement session receives the earning.
    """
    class Status(models.TextChoices):
        PENDING   = "PENDING",   "Pending Replacement Session"
        CONDUCTED = "CONDUCTED", "Replacement Session Conducted (Entitlement Consumed)"
        CANCELLED = "CANCELLED", "Replacement Session Cancelled (Entitlement Preserved)"

    client = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="batch_transfers",
        limit_choices_to={"role": "CLIENT"},
    )
    trainer = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="batch_transfers_conducted",
        limit_choices_to={"role": "TRAINER"},
        help_text="Trainer conducting the sessions",
    )
    original_session = models.ForeignKey(
        "group_workouts.GroupWorkoutSession",
        on_delete=models.CASCADE,
        related_name="transfers_out",
        help_text="The original regular batch session the client transferred away from",
    )
    replacement_session = models.ForeignKey(
        "group_workouts.GroupWorkoutSession",
        on_delete=models.CASCADE,
        related_name="transfers_in",
        help_text="The alternative batch session the client is attending instead",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    transferred_at = models.DateTimeField(auto_now_add=True)
    consumed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-transferred_at"]
        verbose_name = "Alternative Batch Transfer"
        verbose_name_plural = "Alternative Batch Transfers"
        constraints = [
            models.UniqueConstraint(
                fields=["client", "original_session"],
                condition=models.Q(status__in=["PENDING", "CONDUCTED"]),
                name="unique_active_or_conducted_batch_transfer",
            )
        ]

    def __str__(self):
        return f"Transfer #{self.id} | {self.client.email}: Session #{self.original_session_id} -> #{self.replacement_session_id} [{self.status}]"
