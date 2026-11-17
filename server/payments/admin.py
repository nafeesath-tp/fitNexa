from django.contrib import admin
from .models import (
    PaymentTransaction,
    SubscriptionCreditLedger,
    TrainerWallet,
    TrainerEarning,
    TrainerPayout,
    WalletTransaction,
    AlternativeBatchTransfer,
)


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ["id", "client", "subscription", "amount", "currency", "status", "payment_gateway", "created_at"]
    list_filter = ["status", "transaction_type", "payment_gateway"]
    search_fields = ["client__email", "stripe_session_id", "idempotency_key"]
    readonly_fields = [f.name for f in PaymentTransaction._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SubscriptionCreditLedger)
class SubscriptionCreditLedgerAdmin(admin.ModelAdmin):
    list_display = ["id", "client", "subscription", "credit_type", "action", "amount", "period_number", "balance_after", "created_at"]
    list_filter = ["credit_type", "action"]
    search_fields = ["client__email", "reason", "idempotency_key"]
    readonly_fields = [f.name for f in SubscriptionCreditLedger._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(TrainerWallet)
class TrainerWalletAdmin(admin.ModelAdmin):
    list_display = ["id", "trainer", "available_balance", "reserved_balance", "pending_earnings", "total_earned", "total_withdrawn", "updated_at"]
    search_fields = ["trainer__email"]
    readonly_fields = [f.name for f in TrainerWallet._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(TrainerEarning)
class TrainerEarningAdmin(admin.ModelAdmin):
    list_display = ["id", "trainer", "earning_type", "gross_amount", "platform_fee", "trainer_amount", "status", "created_at"]
    list_filter = ["earning_type", "status"]
    search_fields = ["trainer__email", "client__email", "idempotency_key"]
    readonly_fields = [f.name for f in TrainerEarning._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(TrainerPayout)
class TrainerPayoutAdmin(admin.ModelAdmin):
    list_display = ["id", "trainer", "amount", "status", "payment_reference", "requested_at", "processed_at"]
    list_filter = ["status"]
    search_fields = ["trainer__email", "payment_reference"]
    readonly_fields = [f.name for f in TrainerPayout._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = ["id", "wallet", "transaction_type", "amount", "balance_after", "reference_id", "idempotency_key", "created_at"]
    list_filter = ["transaction_type"]
    search_fields = ["wallet__trainer__email", "reference_id", "description", "idempotency_key"]
    readonly_fields = [f.name for f in WalletTransaction._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AlternativeBatchTransfer)
class AlternativeBatchTransferAdmin(admin.ModelAdmin):
    list_display = ["id", "client", "trainer", "original_session", "replacement_session", "status", "transferred_at", "consumed_at"]
    list_filter = ["status"]
    search_fields = ["client__email", "trainer__email"]
    readonly_fields = [f.name for f in AlternativeBatchTransfer._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
