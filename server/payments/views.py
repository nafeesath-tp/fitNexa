from decimal import Decimal, ROUND_HALF_UP
from django.conf import settings
from django.db.models import Sum, Count, Q
from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsTrainer, IsAdmin, IsClient
from accounts.models import User
from group_workouts.models import GroupWorkoutSession
from .models import (
    PaymentTransaction,
    SubscriptionCreditLedger,
    TrainerWallet,
    TrainerEarning,
    TrainerPayout,
    WalletTransaction,
    AlternativeBatchTransfer,
)
from .serializers import (
    PaymentTransactionSerializer,
    SubscriptionCreditLedgerSerializer,
    WalletTransactionSerializer,
    TrainerWalletSerializer,
    TrainerEarningSerializer,
    TrainerPayoutSerializer,
    PayoutRequestCreateSerializer,
    PayoutConfirmSerializer,
    PayoutRejectSerializer,
    AlternativeBatchTransferSerializer,
    BatchTransferRequestSerializer,
)
from .services import (
    get_or_create_trainer_wallet,
    request_trainer_payout,
    process_payout_by_admin,
    confirm_payout_by_admin,
    reject_payout_by_admin,
    fail_payout_by_admin,
    create_alternative_batch_transfer,
)


# ── Phase 4: Trainer Features ────────────────────────────────────────────────

class TrainerEarningsDashboardAPIView(APIView):
    """
    GET /api/payments/trainer/dashboard/
    Provides an all-in-one financial dashboard for the logged-in Trainer:
    - Balances: available, reserved, pending, total earned, total withdrawn.
    - Separate personal vs group workout earnings metrics.
    - Recent earnings, transactions, and payout history.
    """
    permission_classes = [IsAuthenticated, IsTrainer]

    def get(self, request):
        trainer = request.user
        wallet = get_or_create_trainer_wallet(trainer)

        earnings_qs = TrainerEarning.objects.filter(trainer=trainer)

        # Separate Personal vs Group earnings
        personal_qs = earnings_qs.filter(
            earning_type__in=[
                TrainerEarning.EarningType.PERSONAL_SESSION,
                TrainerEarning.EarningType.PERSONAL_LATE_CANCELLATION,
                TrainerEarning.EarningType.PERSONAL_NO_SHOW,
            ]
        )
        group_qs = earnings_qs.filter(earning_type=TrainerEarning.EarningType.GROUP_SESSION)

        personal_metrics = personal_qs.aggregate(
            total=Sum("trainer_amount"),
            count=Count("id"),
        )
        group_metrics = group_qs.aggregate(
            total=Sum("trainer_amount"),
            count=Count("id"),
        )

        recent_earnings = earnings_qs[:10]
        recent_transactions = WalletTransaction.objects.filter(wallet=wallet)[:10]
        recent_payouts = TrainerPayout.objects.filter(trainer=trainer)[:5]

        data = {
            "wallet": TrainerWalletSerializer(wallet).data,
            "metrics": {
                "personal_earnings": {
                    "total": personal_metrics["total"] or Decimal("0.00"),
                    "count": personal_metrics["count"],
                },
                "group_earnings": {
                    "total": group_metrics["total"] or Decimal("0.00"),
                    "count": group_metrics["count"],
                },
                "total_earnings": (personal_metrics["total"] or Decimal("0.00")) + (group_metrics["total"] or Decimal("0.00")),
                "total_sessions_conducted": personal_metrics["count"] + group_metrics["count"],
            },
            "recent_earnings": TrainerEarningSerializer(recent_earnings, many=True).data,
            "recent_transactions": WalletTransactionSerializer(recent_transactions, many=True).data,
            "recent_payouts": TrainerPayoutSerializer(recent_payouts, many=True).data,
        }
        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)


class TrainerEarningsListAPIView(APIView):
    """
    GET /api/payments/trainer/earnings/
    Filterable list of session earnings for the logged-in trainer:
    - earning_type (PERSONAL_SESSION, GROUP_SESSION, etc.)
    - status (PENDING, AVAILABLE, PAID, CANCELLED)
    - start_date / end_date
    """
    permission_classes = [IsAuthenticated, IsTrainer]

    def get(self, request):
        qs = TrainerEarning.objects.filter(trainer=request.user)

        earning_type = request.query_params.get("earning_type")
        if earning_type:
            qs = qs.filter(earning_type=earning_type)

        stat = request.query_params.get("status")
        if stat:
            qs = qs.filter(status=stat)

        start_date = request.query_params.get("start_date")
        if start_date:
            d = parse_date(start_date)
            if d:
                qs = qs.filter(created_at__date__gte=d)

        end_date = request.query_params.get("end_date")
        if end_date:
            d = parse_date(end_date)
            if d:
                qs = qs.filter(created_at__date__lte=d)

        return Response({
            "success": True,
            "count": qs.count(),
            "data": TrainerEarningSerializer(qs[:100], many=True).data,
        }, status=status.HTTP_200_OK)


class TrainerWalletDetailAPIView(APIView):
    """
    GET /api/payments/trainer/wallet/
    Returns the trainer's wallet summary and full audit transaction history.
    """
    permission_classes = [IsAuthenticated, IsTrainer]

    def get(self, request):
        wallet = get_or_create_trainer_wallet(request.user)
        transactions = WalletTransaction.objects.filter(wallet=wallet)

        return Response({
            "success": True,
            "wallet": TrainerWalletSerializer(wallet).data,
            "transactions": WalletTransactionSerializer(transactions[:100], many=True).data,
        }, status=status.HTTP_200_OK)


class TrainerPayoutsListCreateAPIView(APIView):
    """
    GET  /api/payments/trainer/payouts/          - List trainer's payout requests
    POST /api/payments/trainer/payouts/request/  - Request new payout from available balance
    """
    permission_classes = [IsAuthenticated, IsTrainer]

    def get(self, request):
        payouts = TrainerPayout.objects.filter(trainer=request.user)
        return Response({
            "success": True,
            "count": payouts.count(),
            "data": TrainerPayoutSerializer(payouts, many=True).data,
        }, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = PayoutRequestCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        amount = serializer.validated_data["amount"]
        try:
            payout = request_trainer_payout(trainer=request.user, amount=amount)
            return Response({
                "success": True,
                "message": f"Payout request of ₹{amount} submitted successfully.",
                "data": TrainerPayoutSerializer(payout).data,
            }, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ── Phase 5: Admin Payout Management ─────────────────────────────────────────

class AdminPayoutsListAPIView(APIView):
    """
    GET /api/payments/admin/payouts/
    Filterable list of all trainer payout requests:
    - status
    - trainer_id
    - start_date / end_date
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        qs = TrainerPayout.objects.select_related("trainer", "wallet", "processed_by").all()

        stat = request.query_params.get("status")
        if stat:
            qs = qs.filter(status=stat)

        trainer_id = request.query_params.get("trainer_id")
        if trainer_id:
            qs = qs.filter(trainer_id=trainer_id)

        start_date = request.query_params.get("start_date")
        if start_date:
            d = parse_date(start_date)
            if d:
                qs = qs.filter(requested_at__date__gte=d)

        end_date = request.query_params.get("end_date")
        if end_date:
            d = parse_date(end_date)
            if d:
                qs = qs.filter(requested_at__date__lte=d)

        return Response({
            "success": True,
            "count": qs.count(),
            "data": TrainerPayoutSerializer(qs[:100], many=True).data,
        }, status=status.HTTP_200_OK)


class AdminPayoutProcessAPIView(APIView):
    """
    POST /api/payments/admin/payouts/<id>/process/
    Marks payout status as PROCESSING.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, payout_id):
        admin_notes = request.data.get("admin_notes", "")
        try:
            payout = process_payout_by_admin(payout_id=payout_id, admin_user=request.user, admin_notes=admin_notes)
            return Response({
                "success": True,
                "message": f"Payout #{payout.id} marked as processing.",
                "data": TrainerPayoutSerializer(payout).data,
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except TrainerPayout.DoesNotExist:
            return Response({"success": False, "message": "Payout not found."}, status=status.HTTP_404_NOT_FOUND)


class AdminPayoutConfirmAPIView(APIView):
    """
    POST /api/payments/admin/payouts/<id>/confirm/
    Confirms successful bank transfer with payment reference (UTR).
    Deducts reserved balance, increments total withdrawn, creates immutable WalletTransaction.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, payout_id):
        serializer = PayoutConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        ref = serializer.validated_data["payment_reference"]
        notes = serializer.validated_data.get("admin_notes", "")
        try:
            payout = confirm_payout_by_admin(
                payout_id=payout_id,
                admin_user=request.user,
                payment_reference=ref,
                admin_notes=notes,
            )
            return Response({
                "success": True,
                "message": f"Payout #{payout.id} confirmed and fulfilled successfully.",
                "data": TrainerPayoutSerializer(payout).data,
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except TrainerPayout.DoesNotExist:
            return Response({"success": False, "message": "Payout not found."}, status=status.HTTP_404_NOT_FOUND)


class AdminPayoutRejectAPIView(APIView):
    """
    POST /api/payments/admin/payouts/<id>/reject/
    Rejects payout and rolls back reserved balance to available balance.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, payout_id):
        serializer = PayoutRejectSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        reason = serializer.validated_data["failure_reason"]
        notes = serializer.validated_data.get("admin_notes", "")
        try:
            payout = reject_payout_by_admin(
                payout_id=payout_id,
                admin_user=request.user,
                failure_reason=reason,
                admin_notes=notes,
            )
            return Response({
                "success": True,
                "message": f"Payout #{payout.id} rejected. Funds restored to trainer available balance.",
                "data": TrainerPayoutSerializer(payout).data,
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except TrainerPayout.DoesNotExist:
            return Response({"success": False, "message": "Payout not found."}, status=status.HTTP_404_NOT_FOUND)


class AdminPayoutFailAPIView(APIView):
    """
    POST /api/payments/admin/payouts/<id>/fail/
    Marks payout failed due to banking error and restores reserved balance to available balance.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, payout_id):
        serializer = PayoutRejectSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        reason = serializer.validated_data["failure_reason"]
        notes = serializer.validated_data.get("admin_notes", "")
        try:
            payout = fail_payout_by_admin(
                payout_id=payout_id,
                admin_user=request.user,
                failure_reason=reason,
                admin_notes=notes,
            )
            return Response({
                "success": True,
                "message": f"Payout #{payout.id} marked failed. Funds restored to trainer available balance.",
                "data": TrainerPayoutSerializer(payout).data,
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except TrainerPayout.DoesNotExist:
            return Response({"success": False, "message": "Payout not found."}, status=status.HTTP_404_NOT_FOUND)


# ── Phase 6: Admin Financial Monitoring & Revenue Reports ────────────────────

class AdminRevenueAnalyticsAPIView(APIView):
    """
    GET /api/payments/admin/analytics/
    Comprehensive financial report for the platform:
    - Total subscription revenue (Personal vs Group)
    - Platform commission & Trainer earnings
    - Wallet balances: available, reserved, pending
    - Payout summary: requested, processing, completed, rejected
    - Payment failures & refunds
    - Date filtering support (start_date, end_date)
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        tx_qs = PaymentTransaction.objects.all()
        earnings_qs = TrainerEarning.objects.all()
        payouts_qs = TrainerPayout.objects.all()

        start_date = request.query_params.get("start_date")
        if start_date:
            d = parse_date(start_date)
            if d:
                tx_qs = tx_qs.filter(created_at__date__gte=d)
                earnings_qs = earnings_qs.filter(created_at__date__gte=d)
                payouts_qs = payouts_qs.filter(requested_at__date__gte=d)

        end_date = request.query_params.get("end_date")
        if end_date:
            d = parse_date(end_date)
            if d:
                tx_qs = tx_qs.filter(created_at__date__lte=d)
                earnings_qs = earnings_qs.filter(created_at__date__lte=d)
                payouts_qs = payouts_qs.filter(requested_at__date__lte=d)

        # Revenue calculations: distinguish Gross vs Refunded vs Net
        from .constants import convert_to_inr, DEFAULT_USD_TO_INR_EXCHANGE_RATE

        successful_purchases = tx_qs.filter(
            status=PaymentTransaction.Status.SUCCESS,
            transaction_type__in=[
                PaymentTransaction.TransactionType.SUBSCRIPTION_PURCHASE,
                PaymentTransaction.TransactionType.SUBSCRIPTION_UPGRADE,
                PaymentTransaction.TransactionType.SUBSCRIPTION_RENEWAL,
            ]
        )
        refunded_txs = tx_qs.filter(status=PaymentTransaction.Status.REFUNDED)

        # Normalize revenue to INR using configured exchange rate for USD transactions
        def sum_in_inr(queryset):
            total = Decimal("0.00")
            for tx in queryset.iterator():
                total += convert_to_inr(tx.amount, tx.currency)
            return total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        gross_revenue = sum_in_inr(successful_purchases)
        refunded_revenue = sum_in_inr(refunded_txs)
        net_revenue = gross_revenue - refunded_revenue

        personal_gross = sum_in_inr(successful_purchases.filter(subscription__plan__name="PREMIUM"))
        personal_refunds = sum_in_inr(refunded_txs.filter(subscription__plan__name="PREMIUM"))
        personal_net = personal_gross - personal_refunds

        group_gross = sum_in_inr(successful_purchases.filter(subscription__plan__name="GROUP"))
        group_refunds = sum_in_inr(refunded_txs.filter(subscription__plan__name="GROUP"))
        group_net = group_gross - group_refunds

        # Commission and earnings
        platform_commission_total = earnings_qs.aggregate(total=Sum("platform_fee"))["total"] or Decimal("0.00")
        trainer_earnings_total = earnings_qs.aggregate(total=Sum("trainer_amount"))["total"] or Decimal("0.00")

        # System-wide wallet balances (current snapshot)
        wallets_agg = TrainerWallet.objects.aggregate(
            available=Sum("available_balance"),
            reserved=Sum("reserved_balance"),
            pending=Sum("pending_earnings"),
            total_earned=Sum("total_earned"),
            total_withdrawn=Sum("total_withdrawn"),
        )

        # Payout stats
        payout_stats = {
            "requested": {
                "count": payouts_qs.filter(status=TrainerPayout.Status.REQUESTED).count(),
                "amount": payouts_qs.filter(status=TrainerPayout.Status.REQUESTED).aggregate(Sum("amount"))["amount__sum"] or Decimal("0.00"),
            },
            "processing": {
                "count": payouts_qs.filter(status=TrainerPayout.Status.PROCESSING).count(),
                "amount": payouts_qs.filter(status=TrainerPayout.Status.PROCESSING).aggregate(Sum("amount"))["amount__sum"] or Decimal("0.00"),
            },
            "completed": {
                "count": payouts_qs.filter(status=TrainerPayout.Status.COMPLETED).count(),
                "amount": payouts_qs.filter(status=TrainerPayout.Status.COMPLETED).aggregate(Sum("amount"))["amount__sum"] or Decimal("0.00"),
            },
            "rejected": {
                "count": payouts_qs.filter(status=TrainerPayout.Status.REJECTED).count(),
                "amount": payouts_qs.filter(status=TrainerPayout.Status.REJECTED).aggregate(Sum("amount"))["amount__sum"] or Decimal("0.00"),
            },
            "failed": {
                "count": payouts_qs.filter(status=TrainerPayout.Status.FAILED).count(),
                "amount": payouts_qs.filter(status=TrainerPayout.Status.FAILED).aggregate(Sum("amount"))["amount__sum"] or Decimal("0.00"),
            },
        }

        # Failed & Refunded payments
        failed_payments = tx_qs.filter(status=PaymentTransaction.Status.FAILED).aggregate(
            count=Count("id"), amount=Sum("amount")
        )
        refunded_payments = tx_qs.filter(status=PaymentTransaction.Status.REFUNDED).aggregate(
            count=Count("id"), amount=Sum("amount")
        )

        data = {
            "revenue": {
                "gross_revenue": gross_revenue,
                "refunded_revenue": refunded_revenue,
                "net_revenue": net_revenue,
                "total_subscription_revenue": net_revenue,
                "personal_training_gross": personal_gross,
                "personal_training_net": personal_net,
                "personal_training_revenue": personal_net,
                "group_workout_gross": group_gross,
                "group_workout_net": group_net,
                "group_workout_revenue": group_net,
                "platform_commission": platform_commission_total,
                "trainer_earnings": trainer_earnings_total,
                "usd_to_inr_exchange_rate": str(getattr(settings, "USD_TO_INR_EXCHANGE_RATE", DEFAULT_USD_TO_INR_EXCHANGE_RATE)),
            },
            "wallets": {
                "total_available_balance": wallets_agg["available"] or Decimal("0.00"),
                "total_reserved_balance": wallets_agg["reserved"] or Decimal("0.00"),
                "total_pending_earnings": wallets_agg["pending"] or Decimal("0.00"),
                "lifetime_total_earned": wallets_agg["total_earned"] or Decimal("0.00"),
                "lifetime_total_withdrawn": wallets_agg["total_withdrawn"] or Decimal("0.00"),
            },
            "payouts": payout_stats,
            "disruptions": {
                "failed_payments_count": failed_payments["count"],
                "failed_payments_amount": failed_payments["amount"] or Decimal("0.00"),
                "refunds_count": refunded_payments["count"],
                "refunds_amount": refunded_payments["amount"] or Decimal("0.00"),
            },
        }
        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)


class AdminTransactionsListAPIView(APIView):
    """
    GET /api/payments/admin/transactions/
    Filterable list of all payment transactions:
    - status (PENDING, SUCCESS, FAILED, REFUNDED)
    - transaction_type
    - payment_gateway
    - search (client email, stripe id, idempotency key)
    - start_date / end_date
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        qs = PaymentTransaction.objects.select_related("client", "subscription", "subscription__plan").all()

        stat = request.query_params.get("status")
        if stat:
            qs = qs.filter(status=stat)

        ttype = request.query_params.get("transaction_type")
        if ttype:
            qs = qs.filter(transaction_type=ttype)

        gateway = request.query_params.get("payment_gateway")
        if gateway:
            qs = qs.filter(payment_gateway=gateway)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(client__email__icontains=search)
                | Q(stripe_session_id__icontains=search)
                | Q(stripe_payment_intent_id__icontains=search)
                | Q(idempotency_key__icontains=search)
            )

        start_date = request.query_params.get("start_date")
        if start_date:
            d = parse_date(start_date)
            if d:
                qs = qs.filter(created_at__date__gte=d)

        end_date = request.query_params.get("end_date")
        if end_date:
            d = parse_date(end_date)
            if d:
                qs = qs.filter(created_at__date__lte=d)

        return Response({
            "success": True,
            "count": qs.count(),
            "data": PaymentTransactionSerializer(qs[:100], many=True).data,
        }, status=status.HTTP_200_OK)


class AdminTrainerEarningsListAPIView(APIView):
    """
    GET /api/payments/admin/earnings/
    List all trainer earnings across the platform with filters.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        qs = TrainerEarning.objects.select_related("trainer", "client").all()

        trainer_id = request.query_params.get("trainer_id")
        if trainer_id:
            qs = qs.filter(trainer_id=trainer_id)

        earning_type = request.query_params.get("earning_type")
        if earning_type:
            qs = qs.filter(earning_type=earning_type)

        stat = request.query_params.get("status")
        if stat:
            qs = qs.filter(status=stat)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(trainer__email__icontains=search)
                | Q(client__email__icontains=search)
                | Q(idempotency_key__icontains=search)
            )

        return Response({
            "success": True,
            "count": qs.count(),
            "data": TrainerEarningSerializer(qs[:100], many=True).data,
        }, status=status.HTTP_200_OK)


class AdminCreditLedgersListAPIView(APIView):
    """
    GET /api/payments/admin/credit-ledgers/
    List of subscription credit ledger entries.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        qs = SubscriptionCreditLedger.objects.select_related("client", "subscription").all()

        client_id = request.query_params.get("client_id")
        if client_id:
            qs = qs.filter(client_id=client_id)

        credit_type = request.query_params.get("credit_type")
        if credit_type:
            qs = qs.filter(credit_type=credit_type)

        action = request.query_params.get("action")
        if action:
            qs = qs.filter(action=action)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(client__email__icontains=search)
                | Q(reason__icontains=search)
                | Q(idempotency_key__icontains=search)
            )

        return Response({
            "success": True,
            "count": qs.count(),
            "data": SubscriptionCreditLedgerSerializer(qs[:100], many=True).data,
        }, status=status.HTTP_200_OK)


# ── Alternative Batch Transfer Views ─────────────────────────────────────────

class AlternativeBatchTransferRequestAPIView(APIView):
    """
    POST /api/payments/batch-transfers/request/
    Client requests to transfer an entitlement from their original session
    to an alternative available session created by the same assigned trainer.
    """
    permission_classes = [IsAuthenticated, IsClient]

    def post(self, request):
        serializer = BatchTransferRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        orig_id = serializer.validated_data["original_session_id"]
        repl_id = serializer.validated_data["replacement_session_id"]
        notes = serializer.validated_data.get("notes", "")

        try:
            orig = GroupWorkoutSession.objects.select_related("group_workout__trainer").get(id=orig_id)
            repl = GroupWorkoutSession.objects.select_related("group_workout__trainer").get(id=repl_id)
        except GroupWorkoutSession.DoesNotExist:
            return Response({"success": False, "message": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            transfer = create_alternative_batch_transfer(
                client=request.user,
                original_session=orig,
                replacement_session=repl,
                notes=notes,
            )
            return Response({
                "success": True,
                "message": "Alternative batch transfer booked successfully.",
                "data": AlternativeBatchTransferSerializer(transfer).data,
            }, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AlternativeBatchTransferListAPIView(APIView):
    """
    GET /api/payments/batch-transfers/
    List batch transfers:
    - If client: their transfers
    - If trainer: transfers conducted in their sessions
    - If admin: all transfers
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = AlternativeBatchTransfer.objects.select_related("client", "trainer", "original_session", "replacement_session")
        if request.user.role == User.Role.CLIENT:
            qs = qs.filter(client=request.user)
        elif request.user.role == User.Role.TRAINER:
            qs = qs.filter(trainer=request.user)

        return Response({
            "success": True,
            "count": qs.count(),
            "data": AlternativeBatchTransferSerializer(qs[:100], many=True).data,
        }, status=status.HTTP_200_OK)

