from rest_framework import serializers
from decimal import Decimal
from accounts.models import User
from .models import (
    PaymentTransaction,
    SubscriptionCreditLedger,
    TrainerWallet,
    TrainerEarning,
    TrainerPayout,
    WalletTransaction,
    AlternativeBatchTransfer,
)


class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "role"]


class PaymentTransactionSerializer(serializers.ModelSerializer):
    client = UserBasicSerializer(read_only=True)
    client_email = serializers.CharField(source="client.email", read_only=True)
    plan_name = serializers.CharField(source="subscription.plan.name", read_only=True, default="N/A")
    converted_amount_inr = serializers.SerializerMethodField()
    exchange_rate = serializers.SerializerMethodField()

    class Meta:
        model = PaymentTransaction
        fields = [
            "id",
            "client",
            "client_email",
            "subscription_id",
            "plan_name",
            "transaction_type",
            "amount",
            "currency",
            "converted_amount_inr",
            "exchange_rate",
            "status",
            "payment_gateway",
            "stripe_session_id",
            "stripe_payment_intent_id",
            "idempotency_key",
            "created_at",
            "updated_at",
        ]

    def get_converted_amount_inr(self, obj) -> str:
        from .constants import convert_to_inr
        inr_val = convert_to_inr(obj.amount, obj.currency)
        return str(inr_val)

    def get_exchange_rate(self, obj) -> str:
        from .constants import DEFAULT_USD_TO_INR_EXCHANGE_RATE
        from django.conf import settings
        if (obj.currency or "").upper() in ("USD", "$"):
            rate = getattr(settings, "USD_TO_INR_EXCHANGE_RATE", DEFAULT_USD_TO_INR_EXCHANGE_RATE)
            return str(rate)
        return "1.00"


class SubscriptionCreditLedgerSerializer(serializers.ModelSerializer):
    client = UserBasicSerializer(read_only=True)

    class Meta:
        model = SubscriptionCreditLedger
        fields = [
            "id",
            "client",
            "subscription_id",
            "credit_type",
            "action",
            "amount",
            "period_number",
            "balance_after",
            "reason",
            "idempotency_key",
            "created_at",
        ]


class WalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = [
            "id",
            "wallet_id",
            "transaction_type",
            "amount",
            "balance_after",
            "reference_id",
            "description",
            "idempotency_key",
            "created_at",
        ]


class TrainerWalletSerializer(serializers.ModelSerializer):
    trainer = UserBasicSerializer(read_only=True)

    class Meta:
        model = TrainerWallet
        fields = [
            "id",
            "trainer",
            "available_balance",
            "reserved_balance",
            "pending_earnings",
            "total_earned",
            "total_withdrawn",
            "created_at",
            "updated_at",
        ]


class TrainerEarningSerializer(serializers.ModelSerializer):
    trainer = UserBasicSerializer(read_only=True)
    client = UserBasicSerializer(read_only=True)

    class Meta:
        model = TrainerEarning
        fields = [
            "id",
            "trainer",
            "client",
            "earning_type",
            "status",
            "personal_session_id",
            "group_session_id",
            "gross_amount",
            "platform_fee",
            "trainer_amount",
            "platform_commission_rate",
            "trainer_commission_rate",
            "idempotency_key",
            "notes",
            "created_at",
            "updated_at",
        ]


class TrainerPayoutSerializer(serializers.ModelSerializer):
    trainer = UserBasicSerializer(read_only=True)
    processed_by = UserBasicSerializer(read_only=True)

    class Meta:
        model = TrainerPayout
        fields = [
            "id",
            "trainer",
            "wallet_id",
            "amount",
            "status",
            "payment_reference",
            "failure_reason",
            "admin_notes",
            "processed_by",
            "requested_at",
            "processed_at",
        ]


class PayoutRequestCreateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("1.00"))


class PayoutConfirmSerializer(serializers.Serializer):
    payment_reference = serializers.CharField(max_length=255, required=True, allow_blank=False)
    admin_notes = serializers.CharField(required=False, allow_blank=True, default="")


class PayoutRejectSerializer(serializers.Serializer):
    failure_reason = serializers.CharField(max_length=500, required=True, allow_blank=False)
    admin_notes = serializers.CharField(required=False, allow_blank=True, default="")


class AlternativeBatchTransferSerializer(serializers.ModelSerializer):
    client = UserBasicSerializer(read_only=True)
    trainer = UserBasicSerializer(read_only=True)
    original_session_title = serializers.CharField(source="original_session.group_workout.title", read_only=True)
    original_session_date = serializers.DateField(source="original_session.date", read_only=True)
    replacement_session_title = serializers.CharField(source="replacement_session.group_workout.title", read_only=True)
    replacement_session_date = serializers.DateField(source="replacement_session.date", read_only=True)

    class Meta:
        model = AlternativeBatchTransfer
        fields = [
            "id",
            "client",
            "trainer",
            "original_session_id",
            "original_session_title",
            "original_session_date",
            "replacement_session_id",
            "replacement_session_title",
            "replacement_session_date",
            "status",
            "transferred_at",
            "consumed_at",
            "notes",
        ]


class BatchTransferRequestSerializer(serializers.Serializer):
    original_session_id = serializers.IntegerField(required=True)
    replacement_session_id = serializers.IntegerField(required=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
