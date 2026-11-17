from django.urls import path
from .views import (
    TrainerEarningsDashboardAPIView,
    TrainerEarningsListAPIView,
    TrainerWalletDetailAPIView,
    TrainerPayoutsListCreateAPIView,
    AdminPayoutsListAPIView,
    AdminPayoutProcessAPIView,
    AdminPayoutConfirmAPIView,
    AdminPayoutRejectAPIView,
    AdminPayoutFailAPIView,
    AdminRevenueAnalyticsAPIView,
    AdminTransactionsListAPIView,
    AdminTrainerEarningsListAPIView,
    AdminCreditLedgersListAPIView,
    AlternativeBatchTransferRequestAPIView,
    AlternativeBatchTransferListAPIView,
)

app_name = "payments"

urlpatterns = [
    # ── Phase 4: Trainer Features ─────────────────────────────────────────────
    path("trainer/dashboard/", TrainerEarningsDashboardAPIView.as_view(), name="trainer-dashboard"),
    path("trainer/earnings/", TrainerEarningsListAPIView.as_view(), name="trainer-earnings"),
    path("trainer/wallet/", TrainerWalletDetailAPIView.as_view(), name="trainer-wallet"),
    path("trainer/payouts/", TrainerPayoutsListCreateAPIView.as_view(), name="trainer-payouts-list"),
    path("trainer/payouts/request/", TrainerPayoutsListCreateAPIView.as_view(), name="trainer-payouts-request"),

    # ── Phase 5: Admin Payout Management ─────────────────────────────────────
    path("admin/payouts/", AdminPayoutsListAPIView.as_view(), name="admin-payouts-list"),
    path("admin/payouts/<int:payout_id>/process/", AdminPayoutProcessAPIView.as_view(), name="admin-payout-process"),
    path("admin/payouts/<int:payout_id>/confirm/", AdminPayoutConfirmAPIView.as_view(), name="admin-payout-confirm"),
    path("admin/payouts/<int:payout_id>/reject/", AdminPayoutRejectAPIView.as_view(), name="admin-payout-reject"),
    path("admin/payouts/<int:payout_id>/fail/", AdminPayoutFailAPIView.as_view(), name="admin-payout-fail"),

    # ── Phase 6: Admin Financial Monitoring & Reports ────────────────────────
    path("admin/analytics/", AdminRevenueAnalyticsAPIView.as_view(), name="admin-analytics"),
    path("admin/transactions/", AdminTransactionsListAPIView.as_view(), name="admin-transactions"),
    path("admin/earnings/", AdminTrainerEarningsListAPIView.as_view(), name="admin-earnings"),
    path("admin/credit-ledgers/", AdminCreditLedgersListAPIView.as_view(), name="admin-credit-ledgers"),

    # ── Alternative Batch Transfers ──────────────────────────────────────────
    path("batch-transfers/", AlternativeBatchTransferListAPIView.as_view(), name="batch-transfers-list"),
    path("batch-transfers/request/", AlternativeBatchTransferRequestAPIView.as_view(), name="batch-transfers-request"),
]

