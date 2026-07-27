from django.urls import path

from .views import (
    PublicPlanListAPIView,
    AdminPlanListCreateAPIView,
    AdminPlanDetailAPIView,
    AdminSubscriptionListAPIView,
    ClientPurchaseAPIView,
    ClientConfirmPaymentAPIView,
    ClientCurrentSubscriptionAPIView,
    ClientSubscriptionHistoryAPIView,
)

urlpatterns = [
    # ── Public ──────────────────────────────────────────────────────────────
    # GET  /api/subscriptions/plans/
    path("plans/", PublicPlanListAPIView.as_view(), name="public-plan-list"),

    # ── Admin ────────────────────────────────────────────────────────────────
    # GET  /api/subscriptions/admin/plans/
    # POST /api/subscriptions/admin/plans/
    path("admin/plans/", AdminPlanListCreateAPIView.as_view(), name="admin-plan-list-create"),

    # GET    /api/subscriptions/admin/plans/<plan_id>/
    # PATCH  /api/subscriptions/admin/plans/<plan_id>/
    # DELETE /api/subscriptions/admin/plans/<plan_id>/
    path("admin/plans/<int:plan_id>/", AdminPlanDetailAPIView.as_view(), name="admin-plan-detail"),

    # GET  /api/subscriptions/admin/subscriptions/
    path("admin/subscriptions/", AdminSubscriptionListAPIView.as_view(), name="admin-subscription-list"),

    # ── Client ───────────────────────────────────────────────────────────────
    # POST /api/subscriptions/client/purchase/
    path("client/purchase/", ClientPurchaseAPIView.as_view(), name="client-purchase"),

    # POST /api/subscriptions/client/<subscription_id>/confirm/
    path("client/<int:subscription_id>/confirm/", ClientConfirmPaymentAPIView.as_view(), name="client-confirm"),

    # GET  /api/subscriptions/client/current/
    path("client/current/", ClientCurrentSubscriptionAPIView.as_view(), name="client-current"),

    # GET  /api/subscriptions/client/history/
    path("client/history/", ClientSubscriptionHistoryAPIView.as_view(), name="client-history"),
]
