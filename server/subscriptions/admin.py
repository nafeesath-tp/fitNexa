from django.contrib import admin
from .models import SubscriptionPlan, ClientSubscription


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display  = ["name", "price_monthly", "price_yearly", "is_active", "created_at"]
    list_filter   = ["is_active", "name"]
    search_fields = ["name"]
    ordering      = ["price_monthly"]


@admin.register(ClientSubscription)
class ClientSubscriptionAdmin(admin.ModelAdmin):
    list_display  = ["client", "plan", "billing_cycle", "payment_status", "auto_renew", "expires_at"]
    list_filter   = ["payment_status", "billing_cycle", "plan__name"]
    search_fields = ["client__email"]
    ordering      = ["-created_at"]
    readonly_fields = ["created_at", "updated_at"]
