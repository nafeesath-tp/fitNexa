from decimal import Decimal
from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from accounts.models import User
from .models import SubscriptionPlan, ClientSubscription


# ── Plan serialisers ──────────────────────────────────────────────────────────

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """Read-only public plan listing — used by the client plans page."""

    class Meta:
        model  = SubscriptionPlan
        fields = [
            "id", "name", "price_monthly", "price_yearly",
            "features", "is_active",
        ]
        read_only_fields = fields


class AdminSubscriptionPlanSerializer(serializers.ModelSerializer):
    """
    Full plan serialiser for admin CRUD.

    features must be a list of strings:
        ["Access Basic Training Videos", "Browse Trainers"]
    Django's JSONField accepts this without extra validation, but we add
    a light check so the admin gets a clear error instead of a 500.
    """

    class Meta:
        model  = SubscriptionPlan
        fields = [
            "id", "name", "price_monthly", "price_yearly",
            "features", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_features(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("features must be a JSON list of strings.")
        if not all(isinstance(item, str) for item in value):
            raise serializers.ValidationError("Every feature must be a string.")
        return value

    def validate_price_monthly(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value

    def validate_price_yearly(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value


# ── Subscription serialisers ──────────────────────────────────────────────────

class ClientSubscriptionSerializer(serializers.ModelSerializer):
    """
    Full subscription record for client history / current view.
    Nests a lightweight plan snapshot so the client page doesn't need
    a second API call.
    """

    plan = SubscriptionPlanSerializer(read_only=True)
    is_currently_active = serializers.BooleanField(read_only=True)

    class Meta:
        model  = ClientSubscription
        fields = [
            "id", "plan", "billing_cycle", "payment_status",
            "auto_renew", "amount_paid",
            "started_at", "expires_at",
            "is_currently_active", "created_at",
        ]
        read_only_fields = fields


class PurchaseSubscriptionSerializer(serializers.Serializer):
    """
    Validates client purchase intent.

    plan_id       — the plan being purchased
    billing_cycle — MONTHLY or YEARLY
    auto_renew    — optional, default False
    """

    plan_id = serializers.IntegerField()
    billing_cycle = serializers.ChoiceField(
        choices=ClientSubscription.BillingCycle.choices,
        default=ClientSubscription.BillingCycle.MONTHLY,
    )
    auto_renew = serializers.BooleanField(default=False)

    def validate_plan_id(self, value):
        try:
            plan = SubscriptionPlan.objects.get(id=value, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            raise serializers.ValidationError("Plan not found or is no longer active.")
        return value


# ── Admin overview ────────────────────────────────────────────────────────────

class AdminClientSubscriptionSerializer(serializers.ModelSerializer):
    """Admin view: subscription + who it belongs to."""

    plan_name      = serializers.CharField(source="plan.name",    read_only=True)
    client_email   = serializers.EmailField(source="client.email", read_only=True)
    is_currently_active = serializers.BooleanField(read_only=True)

    class Meta:
        model  = ClientSubscription
        fields = [
            "id", "client_email", "plan_name", "billing_cycle",
            "payment_status", "auto_renew", "amount_paid",
            "started_at", "expires_at", "is_currently_active", "created_at",
        ]
        read_only_fields = fields
