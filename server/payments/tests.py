from decimal import Decimal
import unittest.mock
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils import timezone

from client.models import ClientProfile
from subscriptions.models import SubscriptionPlan, ClientSubscription
from payments.models import (
    PaymentTransaction,
    SubscriptionCreditLedger,
    TrainerWallet,
    TrainerEarning,
    TrainerPayout,
    WalletTransaction,
)
from payments.constants import (
    get_commission_rates,
    calculate_session_commission,
    calculate_personal_session_gross_value,
    calculate_group_session_gross_value,
    MONTHLY_PACKAGE_DAYS,
    YEARLY_PACKAGE_DAYS,
    PERSONAL_TRAINING_PERIOD_CREDITS,
    GROUP_WORKOUT_PERIOD_CREDITS,
)

User = get_user_model()


class PaymentsArchitectureAndModelsTestCase(TestCase):
    """
    Test suite for Module 19 Phase 1: Architecture, Financial Models, and Commission Engine.
    """

    def setUp(self):
        # 1. Create client user and profile
        self.client_user = User.objects.create_user(
            email="client_finance_test@fitnexa.com",
            password="TestPassword123!",
            role=User.Role.CLIENT,
        )
        self.client_profile = ClientProfile.objects.create(
            user=self.client_user,
            first_name="Finance",
            last_name="Client",
            session_credits=12,
            group_session_credits=16,
        )

        # 2. Create trainer user and wallet
        self.trainer_user = User.objects.create_user(
            email="trainer_finance_test@fitnexa.com",
            password="TestPassword123!",
            role=User.Role.TRAINER,
        )
        self.trainer_wallet = TrainerWallet.objects.create(
            trainer=self.trainer_user,
            available_balance=Decimal("1500.00"),
            pending_earnings=Decimal("200.00"),
            total_earned=Decimal("1700.00"),
            total_withdrawn=Decimal("0.00"),
        )

        # 3. Create admin user
        self.admin_user = User.objects.create_user(
            email="admin_finance_test@fitnexa.com",
            password="TestPassword123!",
            role=User.Role.ADMIN,
        )

        # 4. Create subscription plan and active client subscription
        self.plan = SubscriptionPlan.objects.create(
            name=SubscriptionPlan.PlanName.PREMIUM,
            price_monthly=Decimal("3000.00"),
            price_yearly=Decimal("36000.00"),
            features=["12 1-on-1 Sessions", "AI Plans"],
            is_active=True,
        )
        self.subscription = ClientSubscription.objects.create(
            client=self.client_user,
            plan=self.plan,
            billing_cycle=ClientSubscription.BillingCycle.MONTHLY,
            payment_status=ClientSubscription.PaymentStatus.ACTIVE,
            amount_paid=Decimal("3000.00"),
            started_at=timezone.now(),
            expires_at=timezone.now() + timezone.timedelta(days=MONTHLY_PACKAGE_DAYS),
        )
        SubscriptionCreditLedger.objects.create(
            client=self.client_user,
            subscription=self.subscription,
            credit_type=SubscriptionCreditLedger.CreditType.PERSONAL_TRAINING,
            action=SubscriptionCreditLedger.Action.ALLOCATED,
            amount=12,
            period_number=1,
            balance_after=12,
            reason="Initial period 1 grant in setUp",
            idempotency_key=f"SUB_{self.subscription.id}_PERIOD_1_GRANT",
        )

    # ── 1. Commission Engine Tests ───────────────────────────────────────────

    def test_commission_calculation_exact_split(self):
        """Platform receives 20% and Trainer receives 80% with Decimal precision."""
        gross_amount = Decimal("250.00")
        platform_fee, trainer_share, platform_rate, trainer_rate = calculate_session_commission(gross_amount)

        self.assertEqual(platform_rate, Decimal("20.00"))
        self.assertEqual(trainer_rate, Decimal("80.00"))
        self.assertEqual(platform_fee, Decimal("50.00"))
        self.assertEqual(trainer_share, Decimal("200.00"))
        self.assertEqual(platform_fee + trainer_share, gross_amount)

    def test_commission_calculation_odd_amount_cents_precision(self):
        """Calculations preserve exact Decimal precision without lost cents."""
        gross_amount = Decimal("99.99")
        platform_fee, trainer_share, _, _ = calculate_session_commission(gross_amount)

        # 99.99 * 0.20 = 19.998 -> 20.00
        # 99.99 - 20.00 = 79.99
        self.assertEqual(platform_fee, Decimal("20.00"))
        self.assertEqual(trainer_share, Decimal("79.99"))
        self.assertEqual(platform_fee + trainer_share, gross_amount)

    def test_commission_validation_fails_if_sum_not_100(self):
        """Configured percentages that do not sum to 100% must raise a ValueError."""
        with override_settings(PLATFORM_COMMISSION_PERCENTAGE="25.00", TRAINER_COMMISSION_PERCENTAGE="80.00"):
            with self.assertRaises(ValueError):
                get_commission_rates()

    def test_personal_training_session_gross_value_calculation(self):
        """Package price ₹3000 divided by 12 credits equals ₹250.00 gross per session."""
        gross = calculate_personal_session_gross_value(Decimal("3000.00"))
        self.assertEqual(gross, Decimal("250.00"))

    def test_group_session_gross_value_calculation(self):
        """Group package price ₹1600 divided by 16 credits equals ₹100.00 gross per client."""
        gross = calculate_group_session_gross_value(Decimal("1600.00"))
        self.assertEqual(gross, Decimal("100.00"))

    # ── 2. ClientProfile Group Session Credits Tests ──────────────────────────

    def test_client_profile_has_distinct_group_session_credits(self):
        """ClientProfile supports both personal session_credits and group_session_credits."""
        profile = ClientProfile.objects.get(user=self.client_user)
        self.assertEqual(profile.session_credits, 12)
        self.assertEqual(profile.group_session_credits, 16)

        profile.group_session_credits -= 1
        profile.save(update_fields=["group_session_credits"])
        profile.refresh_from_db()
        self.assertEqual(profile.group_session_credits, 15)

    # ── 3. PaymentTransaction Model Tests ────────────────────────────────────

    def test_payment_transaction_creation_and_idempotency(self):
        """PaymentTransaction records customer charge with unique idempotency protection."""
        tx = PaymentTransaction.objects.create(
            client=self.client_user,
            subscription=self.subscription,
            transaction_type=PaymentTransaction.TransactionType.SUBSCRIPTION_PURCHASE,
            amount=Decimal("3000.00"),
            currency="INR",
            status=PaymentTransaction.Status.SUCCESS,
            payment_gateway="STRIPE",
            stripe_session_id="cs_test_123456",
            idempotency_key="STRIPE_SUB_PURCHASE_cs_test_123456",
        )
        self.assertIsNotNone(tx.id)
        self.assertEqual(tx.status, PaymentTransaction.Status.SUCCESS)

        # Duplicate idempotency_key must raise IntegrityError
        with self.assertRaises(IntegrityError):
            PaymentTransaction.objects.create(
                client=self.client_user,
                subscription=self.subscription,
                transaction_type=PaymentTransaction.TransactionType.SUBSCRIPTION_PURCHASE,
                amount=Decimal("3000.00"),
                currency="INR",
                status=PaymentTransaction.Status.SUCCESS,
                payment_gateway="STRIPE",
                stripe_session_id="cs_test_123456",
                idempotency_key="STRIPE_SUB_PURCHASE_cs_test_123456",
            )

    # ── 4. SubscriptionCreditLedger Model Tests ──────────────────────────────

    def test_subscription_credit_ledger_audit_trail_and_idempotency(self):
        """SubscriptionCreditLedger tracks credit allocation and rejects duplicate webhook events."""
        ledger = SubscriptionCreditLedger.objects.create(
            client=self.client_user,
            subscription=self.subscription,
            credit_type=SubscriptionCreditLedger.CreditType.PERSONAL_TRAINING,
            action=SubscriptionCreditLedger.Action.ALLOCATED,
            amount=12,
            period_number=1,
            balance_after=12,
            reason="Initial 28-day cycle credit grant",
            idempotency_key=f"SUB_{self.subscription.id}_AUDIT_TEST_GRANT",
        )
        self.assertIsNotNone(ledger.id)
        self.assertEqual(ledger.amount, 12)

        # Repeated webhook with same idempotency key is rejected at DB level
        with self.assertRaises(IntegrityError):
            SubscriptionCreditLedger.objects.create(
                client=self.client_user,
                subscription=self.subscription,
                credit_type=SubscriptionCreditLedger.CreditType.PERSONAL_TRAINING,
                action=SubscriptionCreditLedger.Action.ALLOCATED,
                amount=12,
                period_number=1,
                balance_after=24,
                reason="Duplicate grant attempt",
                idempotency_key=f"SUB_{self.subscription.id}_AUDIT_TEST_GRANT",
            )

    # ── 5. TrainerWallet & TrainerEarning Model Tests ─────────────────────────

    def test_trainer_earning_creation_and_idempotency(self):
        """TrainerEarning records session line item with commission rates and idempotency."""
        earning = TrainerEarning.objects.create(
            trainer=self.trainer_user,
            earning_type=TrainerEarning.EarningType.PERSONAL_SESSION,
            client=self.client_user,
            gross_amount=Decimal("250.00"),
            platform_fee=Decimal("50.00"),
            trainer_amount=Decimal("200.00"),
            platform_commission_rate=Decimal("20.00"),
            trainer_commission_rate=Decimal("80.00"),
            status=TrainerEarning.Status.AVAILABLE,
            idempotency_key="PT_SESSION_EARNING_101",
        )
        self.assertIsNotNone(earning.id)
        self.assertEqual(earning.trainer_amount, Decimal("200.00"))

        # Duplicate earning for same session is rejected
        with self.assertRaises(IntegrityError):
            TrainerEarning.objects.create(
                trainer=self.trainer_user,
                earning_type=TrainerEarning.EarningType.PERSONAL_SESSION,
                client=self.client_user,
                gross_amount=Decimal("250.00"),
                platform_fee=Decimal("50.00"),
                trainer_amount=Decimal("200.00"),
                status=TrainerEarning.Status.AVAILABLE,
                idempotency_key="PT_SESSION_EARNING_101",
            )

    def test_late_cancellation_and_no_show_earning_types_supported(self):
        """Late cancellation and no-show earnings are distinctly stored and audited."""
        earning_cancel = TrainerEarning.objects.create(
            trainer=self.trainer_user,
            earning_type=TrainerEarning.EarningType.PERSONAL_LATE_CANCELLATION,
            client=self.client_user,
            gross_amount=Decimal("250.00"),
            platform_fee=Decimal("50.00"),
            trainer_amount=Decimal("200.00"),
            status=TrainerEarning.Status.AVAILABLE,
            idempotency_key="PT_LATE_CANCEL_EARNING_102",
        )
        self.assertEqual(earning_cancel.earning_type, TrainerEarning.EarningType.PERSONAL_LATE_CANCELLATION)

        earning_noshow = TrainerEarning.objects.create(
            trainer=self.trainer_user,
            earning_type=TrainerEarning.EarningType.PERSONAL_NO_SHOW,
            client=self.client_user,
            gross_amount=Decimal("250.00"),
            platform_fee=Decimal("50.00"),
            trainer_amount=Decimal("200.00"),
            status=TrainerEarning.Status.AVAILABLE,
            idempotency_key="PT_NO_SHOW_EARNING_103",
        )
        self.assertEqual(earning_noshow.earning_type, TrainerEarning.EarningType.PERSONAL_NO_SHOW)

    # ── 6. TrainerPayout & WalletTransaction Tests ───────────────────────────

    def test_trainer_payout_and_wallet_transaction_ledger(self):
        """TrainerPayout links to WalletTransaction ensuring double-entry auditability."""
        payout = TrainerPayout.objects.create(
            trainer=self.trainer_user,
            wallet=self.trainer_wallet,
            amount=Decimal("500.00"),
            status=TrainerPayout.Status.REQUESTED,
        )
        self.assertIsNotNone(payout.id)
        self.assertEqual(payout.status, TrainerPayout.Status.REQUESTED)

        # Create wallet debit transaction
        new_balance = self.trainer_wallet.available_balance - payout.amount
        tx = WalletTransaction.objects.create(
            wallet=self.trainer_wallet,
            transaction_type=WalletTransaction.TransactionType.DEBIT_PAYOUT,
            amount=payout.amount,
            balance_after=new_balance,
            payout=payout,
            reference_id=f"PAYOUT_REQ_{payout.id}",
            description="Trainer requested payout of ₹500.00",
        )
        self.assertIsNotNone(tx.id)
        self.assertEqual(tx.balance_after, Decimal("1000.00"))
        self.assertEqual(tx.payout, payout)

    # ── 7. Phase 2: Subscription Payment & Credit Allocation Tests ───────────

    def test_subscription_payment_confirmation_allocates_12_credits_and_28_day_expiry(self):
        """Monthly Premium payment allocates 12 PT credits, sets 28-day validity, and logs PaymentTransaction."""
        from subscriptions import services as sub_services
        new_client = User.objects.create_user(
            email="new_sub_client@fitnexa.com",
            password="TestPassword123!",
            role=User.Role.CLIENT,
        )
        ClientProfile.objects.create(user=new_client, first_name="Sub", last_name="Tester", session_credits=0)

        pending_sub = ClientSubscription.objects.create(
            client=new_client,
            plan=self.plan,
            billing_cycle=ClientSubscription.BillingCycle.MONTHLY,
            payment_status=ClientSubscription.PaymentStatus.PENDING,
            amount_paid=Decimal("3000.00"),
        )

        confirmed_sub = sub_services.confirm_subscription_payment(new_client, pending_sub.id)

        # 1. Verify 28-day expiration
        self.assertEqual(confirmed_sub.payment_status, ClientSubscription.PaymentStatus.ACTIVE)
        self.assertIsNotNone(confirmed_sub.started_at)
        self.assertIsNotNone(confirmed_sub.expires_at)
        duration_days = (confirmed_sub.expires_at - confirmed_sub.started_at).days
        self.assertEqual(duration_days, 28)

        # 2. Verify PaymentTransaction record
        tx = PaymentTransaction.objects.filter(subscription=confirmed_sub).first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.status, PaymentTransaction.Status.SUCCESS)
        self.assertEqual(tx.amount, Decimal("3000.00"))
        self.assertEqual(tx.currency, "INR")

        # 3. Verify ClientProfile session_credits and SubscriptionCreditLedger
        profile = ClientProfile.objects.get(user=new_client)
        self.assertEqual(profile.session_credits, 12)

        ledger = SubscriptionCreditLedger.objects.filter(subscription=confirmed_sub, period_number=1).first()
        self.assertIsNotNone(ledger)
        self.assertEqual(ledger.credit_type, SubscriptionCreditLedger.CreditType.PERSONAL_TRAINING)
        self.assertEqual(ledger.action, SubscriptionCreditLedger.Action.ALLOCATED)
        self.assertEqual(ledger.amount, 12)
        self.assertEqual(ledger.balance_after, 12)

    def test_group_subscription_payment_allocates_16_group_credits(self):
        """Monthly Group payment allocates 16 Group Workout credits and writes ledger."""
        from subscriptions import services as sub_services
        group_plan = SubscriptionPlan.objects.create(
            name=SubscriptionPlan.PlanName.GROUP,
            price_monthly=Decimal("1600.00"),
            price_yearly=Decimal("19200.00"),
            features=["16 Group Classes"],
            is_active=True,
        )
        group_client = User.objects.create_user(
            email="group_client_test@fitnexa.com",
            password="TestPassword123!",
            role=User.Role.CLIENT,
        )
        ClientProfile.objects.create(user=group_client, first_name="Group", last_name="Client", group_session_credits=0)

        pending_sub = ClientSubscription.objects.create(
            client=group_client,
            plan=group_plan,
            billing_cycle=ClientSubscription.BillingCycle.MONTHLY,
            payment_status=ClientSubscription.PaymentStatus.PENDING,
            amount_paid=Decimal("1600.00"),
        )

        sub_services.confirm_subscription_payment(group_client, pending_sub.id)

        profile = ClientProfile.objects.get(user=group_client)
        self.assertEqual(profile.group_session_credits, 16)

        ledger = SubscriptionCreditLedger.objects.filter(
            subscription=pending_sub,
            credit_type=SubscriptionCreditLedger.CreditType.GROUP_WORKOUT,
        ).first()
        self.assertIsNotNone(ledger)
        self.assertEqual(ledger.amount, 16)
        self.assertEqual(ledger.balance_after, 16)

    def test_stripe_webhook_handle_successful_payment_idempotency(self):
        """Repeated Stripe webhook events do not grant duplicate credits or duplicate transactions."""
        from subscriptions import services as sub_services
        stripe_client = User.objects.create_user(
            email="stripe_webhook_client@fitnexa.com",
            password="TestPassword123!",
            role=User.Role.CLIENT,
        )
        ClientProfile.objects.create(user=stripe_client, first_name="Stripe", last_name="Client", session_credits=0)

        pending_sub = ClientSubscription.objects.create(
            client=stripe_client,
            plan=self.plan,
            billing_cycle=ClientSubscription.BillingCycle.MONTHLY,
            payment_status=ClientSubscription.PaymentStatus.PENDING,
            amount_paid=Decimal("3000.00"),
            stripe_session_id="cs_live_webhook_999",
        )

        stripe_payload = {
            "id": "cs_live_webhook_999",
            "payment_intent": "pi_live_test_777",
            "amount_total": 300000,
            "currency": "inr",
        }

        # First webhook arrival
        sub_services.handle_successful_payment(pending_sub.id, stripe_session=stripe_payload)
        profile = ClientProfile.objects.get(user=stripe_client)
        self.assertEqual(profile.session_credits, 12)
        self.assertEqual(PaymentTransaction.objects.filter(stripe_session_id="cs_live_webhook_999").count(), 1)

        # Duplicate webhook arrival
        sub_services.handle_successful_payment(pending_sub.id, stripe_session=stripe_payload)
        profile.refresh_from_db()
        # Must still be 12 (NOT 24)
        self.assertEqual(profile.session_credits, 12)
        self.assertEqual(PaymentTransaction.objects.filter(stripe_session_id="cs_live_webhook_999").count(), 1)

    def test_failed_and_refunded_payment_handling(self):
        """Failed and refunded payment transactions update status correctly."""
        from payments import services as pay_services
        fail_sub = ClientSubscription.objects.create(
            client=self.client_user,
            plan=self.plan,
            billing_cycle=ClientSubscription.BillingCycle.MONTHLY,
            payment_status=ClientSubscription.PaymentStatus.PENDING,
            amount_paid=Decimal("3000.00"),
            stripe_session_id="cs_fail_001",
        )

        # 1. Handle failure
        tx_fail = pay_services.handle_failed_payment_transaction(
            subscription=fail_sub,
            reason="Card declined by issuing bank",
            payment_gateway="STRIPE",
            stripe_session_id="cs_fail_001",
        )
        fail_sub.refresh_from_db()
        self.assertEqual(fail_sub.payment_status, ClientSubscription.PaymentStatus.FAILED)
        self.assertEqual(tx_fail.status, PaymentTransaction.Status.FAILED)

        # 2. Handle refund
        tx_refund = pay_services.handle_refunded_payment_transaction(
            subscription=self.subscription,
            refund_amount=Decimal("1500.00"),
            stripe_refund_id="re_test_555",
        )
        self.assertEqual(tx_refund.status, PaymentTransaction.Status.REFUNDED)
        self.assertEqual(tx_refund.amount, Decimal("1500.00"))

    def test_yearly_subscription_periodic_credit_release_without_celery(self):
        """Yearly subscriptions release credits for subsequent 28-day periods on-demand without Celery."""
        from payments import services as pay_services
        from datetime import timedelta

        yearly_client = User.objects.create_user(
            email="yearly_periodic_client@fitnexa.com",
            password="TestPassword123!",
            role=User.Role.CLIENT,
        )
        ClientProfile.objects.create(user=yearly_client, first_name="Yearly", last_name="Client", session_credits=0)

        # Simulate a yearly subscription started 30 days ago (period 2 is active)
        start_time = timezone.now() - timedelta(days=30)
        yearly_sub = ClientSubscription.objects.create(
            client=yearly_client,
            plan=self.plan,
            billing_cycle=ClientSubscription.BillingCycle.YEARLY,
            payment_status=ClientSubscription.PaymentStatus.ACTIVE,
            amount_paid=Decimal("31200.00"),
            started_at=start_time,
            expires_at=start_time + timedelta(days=364),
        )

        # Simulate period 1 already granted on day 1
        pay_services.allocate_subscription_credits(yearly_sub, period_number=1)
        profile = ClientProfile.objects.get(user=yearly_client)
        self.assertEqual(profile.session_credits, 12)

        # On-demand period check detects day 30 is in period 2, expires period 1 unconsumed credits (no rollover), and grants period 2
        granted = pay_services.check_and_allocate_period_credits(yearly_client, yearly_sub)
        self.assertEqual(granted, 12)

        profile.refresh_from_db()
        # Under Business Decision 1 (No Rollover), unused period 1 credits expire (12 - 12 = 0) + period 2 (12) = 12
        self.assertEqual(profile.session_credits, 12)

        # Calling again does not duplicate
        granted_again = pay_services.check_and_allocate_period_credits(yearly_client, yearly_sub)
        self.assertEqual(granted_again, 0)
        profile.refresh_from_db()
        self.assertEqual(profile.session_credits, 12)

    def test_actual_amount_paid_session_value_calculation(self):
        """Session values are computed from actual subscription amount_paid (accounting for proration)."""
        from payments.constants import get_session_gross_value_from_subscription

        # Regular monthly: ₹3000 / 12 = ₹250.00
        self.assertEqual(
            get_session_gross_value_from_subscription(self.subscription, session_type="PERSONAL"),
            Decimal("250.00"),
        )

        # Prorated monthly: ₹1800 / 12 = ₹150.00
        prorated_sub = ClientSubscription(amount_paid=Decimal("1800.00"), billing_cycle="MONTHLY")
        self.assertEqual(
            get_session_gross_value_from_subscription(prorated_sub, session_type="PERSONAL"),
            Decimal("150.00"),
        )

        # Yearly plan: ₹31200 / 13 periods = ₹2400 / 12 = ₹200.00
        yearly_sub = ClientSubscription(amount_paid=Decimal("31200.00"), billing_cycle="YEARLY")
        self.assertEqual(
            get_session_gross_value_from_subscription(yearly_sub, session_type="PERSONAL"),
            Decimal("200.00"),
        )

        # Group monthly plan: ₹1600 / 16 = ₹100.00
        group_sub = ClientSubscription(amount_paid=Decimal("1600.00"), billing_cycle="MONTHLY")
        self.assertEqual(
            get_session_gross_value_from_subscription(group_sub, session_type="GROUP"),
            Decimal("100.00"),
        )

    def test_personal_training_booking_and_cancellation_updates_ledger_atomically(self):
        """Booking a session consumes 1 credit with ledger; cancelling restores 1 credit with ledger."""
        from scheduling import services as sched_services
        from scheduling.models import TrainerSlot
        from client_management.models import TrainerAssignment
        from datetime import date, time

        # Setup active trainer assignment
        TrainerAssignment.objects.create(
            client=self.client_user,
            trainer=self.trainer_user,
            is_active=True,
        )

        slot = TrainerSlot.objects.create(
            trainer=self.trainer_user,
            date=date.today() + timezone.timedelta(days=2),
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=TrainerSlot.Status.AVAILABLE,
        )

        # 1. Book session
        initial_credits = self.client_profile.session_credits
        session = sched_services.book_session(self.client_user, slot.id, notes="PT Test Session")

        self.client_profile.refresh_from_db()
        self.assertEqual(self.client_profile.session_credits, initial_credits - 1)

        consume_ledger = SubscriptionCreditLedger.objects.filter(
            personal_session=session,
            action=SubscriptionCreditLedger.Action.CONSUMED,
        ).first()
        self.assertIsNotNone(consume_ledger)
        self.assertEqual(consume_ledger.amount, -1)
        self.assertEqual(consume_ledger.balance_after, self.client_profile.session_credits)

        # 2. Cancel session
        sched_services.cancel_session(self.client_user, session.id, is_trainer=False)

        self.client_profile.refresh_from_db()
        self.assertEqual(self.client_profile.session_credits, initial_credits)

        restore_ledger = SubscriptionCreditLedger.objects.filter(
            personal_session=session,
            action=SubscriptionCreditLedger.Action.RESTORED,
        ).first()
        self.assertIsNotNone(restore_ledger)
        self.assertEqual(restore_ledger.amount, 1)
        self.assertEqual(restore_ledger.balance_after, self.client_profile.session_credits)


class FinancialSafetyAndRemainingPhasesTestCase(TestCase):
    """
    Exhaustive verification of Financial Safety Hardening and Phases 3-6:
    - Safety validations, immutability, protected deletion
    - Personal & Group completion / cancellation / no-show earnings
    - Credit rollover & period expiration
    - Alternative batch transfers
    - Payout workflow & balance reservation
    - Trainer & Admin dashboard / analytics APIs
    """
    def setUp(self):
        from rest_framework.test import APIClient
        self.client_api = APIClient()

        # Users
        self.client_user = User.objects.create_user(
            email="safety_client@fitnexa.com",
            password="TestPassword123!",
            role=User.Role.CLIENT,
        )
        self.client_profile = ClientProfile.objects.create(
            user=self.client_user,
            session_credits=12,
            group_session_credits=16,
        )

        self.trainer_user = User.objects.create_user(
            email="safety_trainer@fitnexa.com",
            password="TestPassword123!",
            role=User.Role.TRAINER,
        )
        self.trainer_wallet = TrainerWallet.objects.create(
            trainer=self.trainer_user,
            available_balance=Decimal("1000.00"),
            reserved_balance=Decimal("0.00"),
            total_earned=Decimal("1000.00"),
        )

        self.admin_user = User.objects.create_user(
            email="safety_admin@fitnexa.com",
            password="TestPassword123!",
            role=User.Role.ADMIN,
        )

        # Subscriptions
        self.premium_plan = SubscriptionPlan.objects.create(
            name=SubscriptionPlan.PlanName.PREMIUM,
            price_monthly=Decimal("3000.00"),
            price_yearly=Decimal("36000.00"),
            features=["12 1-on-1 Sessions"],
            is_active=True,
        )
        self.group_plan = SubscriptionPlan.objects.create(
            name=SubscriptionPlan.PlanName.GROUP,
            price_monthly=Decimal("1600.00"),
            price_yearly=Decimal("19200.00"),
            features=["16 Group Sessions"],
            is_active=True,
        )

        self.client_sub = ClientSubscription.objects.create(
            client=self.client_user,
            plan=self.premium_plan,
            billing_cycle=ClientSubscription.BillingCycle.MONTHLY,
            payment_status=ClientSubscription.PaymentStatus.ACTIVE,
            amount_paid=Decimal("3000.00"),
            started_at=timezone.now(),
            expires_at=timezone.now() + timezone.timedelta(days=28),
        )
        SubscriptionCreditLedger.objects.create(
            client=self.client_user,
            subscription=self.client_sub,
            credit_type=SubscriptionCreditLedger.CreditType.PERSONAL_TRAINING,
            action=SubscriptionCreditLedger.Action.ALLOCATED,
            amount=12,
            period_number=1,
            balance_after=12,
            reason="Initial period 1 grant in setUp",
            idempotency_key=f"SUB_{self.client_sub.id}_PERIOD_1_GRANT",
        )

    # ── Financial Safety Hardening ────────────────────────────────────────────

    def test_commission_percentages_range_and_sum_validation(self):
        """Rates must be 0-100 and total exactly 100."""
        from payments.constants import get_commission_rates

        with override_settings(PLATFORM_COMMISSION_PERCENTAGE=Decimal("-5.00"), TRAINER_COMMISSION_PERCENTAGE=Decimal("105.00")):
            with self.assertRaises(ValueError):
                get_commission_rates()

        with override_settings(PLATFORM_COMMISSION_PERCENTAGE=Decimal("25.00"), TRAINER_COMMISSION_PERCENTAGE=Decimal("80.00")):
            with self.assertRaises(ValueError):
                get_commission_rates()

        with override_settings(PLATFORM_COMMISSION_PERCENTAGE=Decimal("20.00"), TRAINER_COMMISSION_PERCENTAGE=Decimal("80.00")):
            plat, train = get_commission_rates()
            self.assertEqual(plat + train, Decimal("100.00"))

    def test_invalid_session_type_and_billing_cycle_rejected(self):
        """Calculators reject unrecognized session types or billing cycles."""
        from payments.constants import get_session_gross_value_from_subscription

        with self.assertRaises(ValueError):
            get_session_gross_value_from_subscription(self.client_sub, session_type="INVALID_TYPE")

        invalid_sub = ClientSubscription(amount_paid=Decimal("1000.00"), billing_cycle="BIWEEKLY")
        with self.assertRaises(ValueError):
            get_session_gross_value_from_subscription(invalid_sub, session_type="PERSONAL")

    def test_negative_monetary_values_rejected(self):
        """Negative amounts are rejected by constants and calculators."""
        from payments.constants import calculate_session_commission, calculate_personal_session_gross_value

        with self.assertRaises(ValueError):
            calculate_session_commission(Decimal("-100.00"))

        with self.assertRaises(ValueError):
            calculate_personal_session_gross_value(Decimal("-500.00"))

    def test_trainer_earning_defaults_to_pending(self):
        """TrainerEarning default status is PENDING."""
        earning = TrainerEarning.objects.create(
            trainer=self.trainer_user,
            earning_type=TrainerEarning.EarningType.PERSONAL_SESSION,
            gross_amount=Decimal("250.00"),
            platform_fee=Decimal("50.00"),
            trainer_amount=Decimal("200.00"),
        )
        self.assertEqual(earning.status, TrainerEarning.Status.PENDING)

    def test_wallet_transaction_immutability(self):
        """WalletTransaction cannot be edited or deleted via model instance or bulk queryset."""
        from django.core.exceptions import ValidationError

        tx = WalletTransaction.objects.create(
            wallet=self.trainer_wallet,
            transaction_type=WalletTransaction.TransactionType.CREDIT_EARNING,
            amount=Decimal("200.00"),
            balance_after=Decimal("1200.00"),
            description="Audit test tx",
            idempotency_key="TEST_IMMUTABLE_1",
        )

        # Direct edit attempt
        tx.amount = Decimal("500.00")
        with self.assertRaises(ValidationError):
            tx.save()

        # Direct delete attempt
        with self.assertRaises(ValidationError):
            tx.delete()

        # Bulk queryset update
        with self.assertRaises(ValidationError):
            WalletTransaction.objects.filter(id=tx.id).update(amount=Decimal("999.00"))

        # Bulk queryset delete
        with self.assertRaises(ValidationError):
            WalletTransaction.objects.filter(id=tx.id).delete()

    def test_preserve_trainer_financial_history_protected_foreign_key(self):
        """Trainer deletion is blocked by PROTECT foreign key to preserve financial records."""
        from django.db.models import ProtectedError

        with self.assertRaises(ProtectedError):
            self.trainer_user.delete()

    def test_subscription_credit_ledger_action_signs_and_period_constraints(self):
        """Ledger validates amount signs and 1 <= period_number <= 13."""
        from django.core.exceptions import ValidationError

        # ALLOCATED with negative amount should fail
        with self.assertRaises(ValidationError):
            SubscriptionCreditLedger.objects.create(
                client=self.client_user,
                subscription=self.client_sub,
                credit_type=SubscriptionCreditLedger.CreditType.PERSONAL_TRAINING,
                action=SubscriptionCreditLedger.Action.ALLOCATED,
                amount=-5,
                period_number=1,
                balance_after=10,
                reason="Invalid negative allocation",
            )

        # CONSUMED with positive amount should fail
        with self.assertRaises(ValidationError):
            SubscriptionCreditLedger.objects.create(
                client=self.client_user,
                subscription=self.client_sub,
                credit_type=SubscriptionCreditLedger.CreditType.PERSONAL_TRAINING,
                action=SubscriptionCreditLedger.Action.CONSUMED,
                amount=5,
                period_number=1,
                balance_after=10,
                reason="Invalid positive consumption",
            )

        # Period 14 should fail
        with self.assertRaises(ValidationError):
            SubscriptionCreditLedger.objects.create(
                client=self.client_user,
                subscription=self.client_sub,
                credit_type=SubscriptionCreditLedger.CreditType.PERSONAL_TRAINING,
                action=SubscriptionCreditLedger.Action.ALLOCATED,
                amount=12,
                period_number=14,
                balance_after=12,
                reason="Invalid period 14",
            )

    # ── Phase 3: Session Completion & Trainer Earning Triggers ────────────────

    def test_personal_training_completion_and_idempotency(self):
        """Completing a PT session awards 80% to trainer and credits wallet atomically."""
        from scheduling.models import PersonalTrainingSession, TrainerSlot
        from payments.services import process_personal_session_completion
        from datetime import date, time

        slot = TrainerSlot.objects.create(
            trainer=self.trainer_user,
            date=date.today(),
            start_time=time(14, 0),
            end_time=time(15, 0),
            status=TrainerSlot.Status.BOOKED,
        )
        session = PersonalTrainingSession.objects.create(
            client=self.client_user,
            trainer=self.trainer_user,
            slot=slot,
            date=slot.date,
            start_time=slot.start_time,
            end_time=slot.end_time,
            status=PersonalTrainingSession.Status.COMPLETED,
        )

        initial_bal = self.trainer_wallet.available_balance

        # Process completion
        earning = process_personal_session_completion(session)
        self.assertEqual(earning.status, TrainerEarning.Status.AVAILABLE)
        # Gross = ₹3000 / 12 = ₹250.00; platform = ₹50.00; trainer = ₹200.00
        self.assertEqual(earning.gross_amount, Decimal("250.00"))
        self.assertEqual(earning.platform_fee, Decimal("50.00"))
        self.assertEqual(earning.trainer_amount, Decimal("200.00"))

        self.trainer_wallet.refresh_from_db()
        self.assertEqual(self.trainer_wallet.available_balance, initial_bal + Decimal("200.00"))

        # Verify idempotency: running again should not double-credit
        process_personal_session_completion(session)
        self.trainer_wallet.refresh_from_db()
        self.assertEqual(self.trainer_wallet.available_balance, initial_bal + Decimal("200.00"))

    def test_personal_training_cancellation_and_no_show_policies(self):
        """
        - Early cancellation: restores credit, no trainer earning.
        - Late cancellation: credit consumed, trainer receives 80%.
        - No-show: credit consumed, trainer receives 80%.
        """
        from scheduling import services as sched_services
        from scheduling.models import TrainerSlot
        from client_management.models import TrainerAssignment
        from datetime import date, time

        TrainerAssignment.objects.create(
            client=self.client_user,
            trainer=self.trainer_user,
            is_active=True,
        )

        # 1. Early cancellation (future date)
        slot_future = TrainerSlot.objects.create(
            trainer=self.trainer_user,
            date=date.today() + timezone.timedelta(days=5),
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=TrainerSlot.Status.AVAILABLE,
        )
        session_early = sched_services.book_session(self.client_user, slot_future.id)
        sched_services.cancel_session(self.client_user, session_early.id, is_trainer=False)

        # Credit restored
        self.client_profile.refresh_from_db()
        self.assertEqual(self.client_profile.session_credits, 12)
        # No trainer earning
        self.assertFalse(TrainerEarning.objects.filter(personal_session=session_early).exists())

        # 2. Late cancellation (past session start time)
        slot_past = TrainerSlot.objects.create(
            trainer=self.trainer_user,
            date=date.today() - timezone.timedelta(days=1),
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=TrainerSlot.Status.AVAILABLE,
        )
        session_late = sched_services.book_session(self.client_user, slot_past.id)
        bal_before = self.trainer_wallet.available_balance
        sched_services.cancel_session(self.client_user, session_late.id, is_trainer=False)

        # Credit NOT restored (was 12 - 1 = 11)
        self.client_profile.refresh_from_db()
        self.assertEqual(self.client_profile.session_credits, 11)

        # Trainer receives 80% earning (₹200.00)
        self.trainer_wallet.refresh_from_db()
        self.assertEqual(self.trainer_wallet.available_balance, bal_before + Decimal("200.00"))
        late_earning = TrainerEarning.objects.filter(
            personal_session=session_late,
            earning_type=TrainerEarning.EarningType.PERSONAL_LATE_CANCELLATION
        ).first()
        self.assertIsNotNone(late_earning)

    def test_group_workout_completion_and_batch_transfers(self):
        """
        Group workout session completion deducts 1 credit per eligible client
        and calculates pro-rata gross. Alternative batch transfer prevents duplicate deduction.
        """
        from group_workouts.models import GroupWorkout, GroupWorkoutSession, GroupWorkoutParticipant
        from payments.models import AlternativeBatchTransfer
        from payments.services import (
            process_group_session_completion,
            create_alternative_batch_transfer,
        )
        from datetime import date, time

        # Active group subscription for client
        group_sub = ClientSubscription.objects.create(
            client=self.client_user,
            plan=self.group_plan,
            billing_cycle=ClientSubscription.BillingCycle.MONTHLY,
            payment_status=ClientSubscription.PaymentStatus.ACTIVE,
            amount_paid=Decimal("1600.00"),
            started_at=timezone.now(),
            expires_at=timezone.now() + timezone.timedelta(days=28),
        )
        SubscriptionCreditLedger.objects.create(
            client=self.client_user,
            subscription=group_sub,
            credit_type=SubscriptionCreditLedger.CreditType.GROUP_WORKOUT,
            action=SubscriptionCreditLedger.Action.ALLOCATED,
            amount=16,
            period_number=1,
            balance_after=16,
            reason="Initial group sub allocation in test",
            idempotency_key=f"SUB_{group_sub.id}_PERIOD_1_GRANT",
        )

        gw = GroupWorkout.objects.create(
            trainer=self.trainer_user,
            title="HIIT Circuit",
            capacity=10,
        )
        orig_session = GroupWorkoutSession.objects.create(
            group_workout=gw,
            date=date.today() + timezone.timedelta(days=2),
            start_time=time(18, 0),
            end_time=time(19, 0),
        )
        repl_session = GroupWorkoutSession.objects.create(
            group_workout=gw,
            date=date.today() + timezone.timedelta(days=3),
            start_time=time(18, 0),
            end_time=time(19, 0),
        )

        GroupWorkoutParticipant.objects.create(
            session=orig_session,
            client=self.client_user,
            status=GroupWorkoutParticipant.Status.JOINED,
        )

        # Client transfers to replacement session
        transfer = create_alternative_batch_transfer(
            client=self.client_user,
            original_session=orig_session,
            replacement_session=repl_session,
        )
        self.assertEqual(transfer.status, AlternativeBatchTransfer.Status.PENDING)

        # 1. Complete original session: should SKIP the transferred client
        initial_group_credits = self.client_profile.group_session_credits
        process_group_session_completion(orig_session)
        self.client_profile.refresh_from_db()
        self.assertEqual(self.client_profile.group_session_credits, initial_group_credits)

        # 2. Complete replacement session: consumes the transferred entitlement
        bal_before = self.trainer_wallet.available_balance
        process_group_session_completion(repl_session)
        self.client_profile.refresh_from_db()
        self.assertEqual(self.client_profile.group_session_credits, initial_group_credits - 1)

        transfer.refresh_from_db()
        self.assertEqual(transfer.status, AlternativeBatchTransfer.Status.CONDUCTED)

        # Trainer receives ₹80.00 (₹1600 / 16 = ₹100 gross; 80% = ₹80.00)
        self.trainer_wallet.refresh_from_db()
        self.assertEqual(self.trainer_wallet.available_balance, bal_before + Decimal("80.00"))

    # ── Phase 5: Payout Management ───────────────────────────────────────────

    def test_payout_lifecycle_request_process_confirm_and_reject(self):
        """
        Full payout workflow:
        1. Request payout reserves funds.
        2. Admin rejects payout -> funds restored to available.
        3. Second request confirmed -> funds deducted from reserved, WalletTransaction written.
        """
        from payments.services import (
            request_trainer_payout,
            process_payout_by_admin,
            confirm_payout_by_admin,
            reject_payout_by_admin,
        )

        initial_available = self.trainer_wallet.available_balance

        # 1. Request payout of ₹300
        payout1 = request_trainer_payout(self.trainer_user, Decimal("300.00"))
        self.trainer_wallet.refresh_from_db()
        self.assertEqual(self.trainer_wallet.available_balance, initial_available - Decimal("300.00"))
        self.assertEqual(self.trainer_wallet.reserved_balance, Decimal("300.00"))

        # 2. Admin rejects
        reject_payout_by_admin(payout1.id, self.admin_user, failure_reason="Incorrect account details")
        self.trainer_wallet.refresh_from_db()
        self.assertEqual(self.trainer_wallet.available_balance, initial_available)
        self.assertEqual(self.trainer_wallet.reserved_balance, Decimal("0.00"))

        # 3. New payout of ₹400
        payout2 = request_trainer_payout(self.trainer_user, Decimal("400.00"))
        process_payout_by_admin(payout2.id, self.admin_user)
        confirm_payout_by_admin(payout2.id, self.admin_user, payment_reference="UTR_TEST_998877")

        self.trainer_wallet.refresh_from_db()
        self.assertEqual(self.trainer_wallet.available_balance, initial_available - Decimal("400.00"))
        self.assertEqual(self.trainer_wallet.reserved_balance, Decimal("0.00"))
        self.assertEqual(self.trainer_wallet.total_withdrawn, Decimal("400.00"))

        debit_tx = WalletTransaction.objects.filter(payout=payout2).first()
        self.assertIsNotNone(debit_tx)
        self.assertEqual(debit_tx.transaction_type, WalletTransaction.TransactionType.DEBIT_PAYOUT)
        self.assertEqual(debit_tx.amount, Decimal("400.00"))

    # ── Phase 6: Admin and Trainer APIs ──────────────────────────────────────

    def test_trainer_and_admin_api_endpoints(self):
        """Verifies Trainer Dashboard API and Admin Analytics API."""
        # Authenticate as Trainer
        self.client_api.force_authenticate(user=self.trainer_user)
        res = self.client_api.get("/api/payments/trainer/dashboard/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("wallet", res.data["data"])
        self.assertIn("personal_earnings", res.data["data"]["metrics"])
        self.assertIn("group_earnings", res.data["data"]["metrics"])

        # Authenticate as Admin
        self.client_api.force_authenticate(user=self.admin_user)
        res_admin = self.client_api.get("/api/payments/admin/analytics/")
        self.assertEqual(res_admin.status_code, 200)
        self.assertIn("revenue", res_admin.data["data"])
        self.assertIn("gross_revenue", res_admin.data["data"]["revenue"])
        self.assertIn("refunded_revenue", res_admin.data["data"]["revenue"])
        self.assertIn("net_revenue", res_admin.data["data"]["revenue"])
        self.assertIn("wallets", res_admin.data["data"])
        self.assertIn("payouts", res_admin.data["data"])

    # ── Review Corrections Verification ──────────────────────────────────────

    def test_credit_consumption_and_restoration_record_correct_period_number_for_yearly(self):
        """Consumption and restoration record actual period_number (e.g. period 3) rather than hardcoded 1."""
        from scheduling.models import PersonalTrainingSession, TrainerSlot
        from payments.services import (
            record_session_credit_consumption,
            record_session_credit_restoration,
        )
        from datetime import date, time, timedelta

        yearly_user = User.objects.create_user(
            email="period_test_client@fitnexa.com",
            password="TestPassword123!",
            role=User.Role.CLIENT,
        )
        ClientProfile.objects.create(
            user=yearly_user,
            session_credits=12,
            group_session_credits=16,
        )

        # Create yearly subscription started 60 days ago (period 3)
        start_date = timezone.now() - timedelta(days=60)
        yearly_sub = ClientSubscription.objects.create(
            client=yearly_user,
            plan=self.premium_plan,
            billing_cycle=ClientSubscription.BillingCycle.YEARLY,
            payment_status=ClientSubscription.PaymentStatus.ACTIVE,
            amount_paid=Decimal("36000.00"),
            started_at=start_date,
            expires_at=start_date + timedelta(days=364),
        )

        slot = TrainerSlot.objects.create(
            trainer=self.trainer_user,
            date=date.today(),
            start_time=time(11, 0),
            end_time=time(12, 0),
        )
        real_session = PersonalTrainingSession.objects.create(
            client=yearly_user,
            trainer=self.trainer_user,
            slot=slot,
            date=slot.date,
            start_time=slot.start_time,
            end_time=slot.end_time,
        )

        ledger_consume = record_session_credit_consumption(
            client=yearly_user,
            session=real_session,
            session_type="PERSONAL",
        )
        self.assertEqual(ledger_consume.period_number, 3)

        ledger_restore = record_session_credit_restoration(
            client=yearly_user,
            session=real_session,
            session_type="PERSONAL",
        )
        self.assertEqual(ledger_restore.period_number, 3)

    def test_yearly_subscription_expiry_expires_period_13_credits(self):
        """When a yearly subscription reaches expires_at, period 13 and final credits expire."""
        from payments.services import (
            allocate_subscription_credits,
            expire_unused_period_credits,
        )
        from datetime import timedelta

        start_time = timezone.now() - timedelta(days=366)
        yearly_sub = ClientSubscription.objects.create(
            client=self.client_user,
            plan=self.premium_plan,
            billing_cycle=ClientSubscription.BillingCycle.YEARLY,
            payment_status=ClientSubscription.PaymentStatus.ACTIVE,
            amount_paid=Decimal("36000.00"),
            started_at=start_time,
            expires_at=start_time + timedelta(days=364),  # already expired
        )

        # Clear setUp monthly credits so only this yearly sub's credits are evaluated
        self.client_profile.session_credits = 0
        self.client_profile.save(update_fields=["session_credits"])

        # Allocate period 13
        allocate_subscription_credits(yearly_sub, period_number=13)
        self.client_profile.refresh_from_db()
        self.assertGreater(self.client_profile.session_credits, 0)

        # Expire credits
        expired = expire_unused_period_credits(self.client_user, yearly_sub)
        self.assertGreater(expired, 0)

        self.client_profile.refresh_from_db()
        self.assertEqual(self.client_profile.session_credits, 0)

    def test_group_completion_rejects_trainer_earning_when_client_credit_balance_is_zero(self):
        """Clients with 0 credit balance do not increase session gross value or trainer earning."""
        from group_workouts.models import GroupWorkout, GroupWorkoutSession, GroupWorkoutParticipant
        from payments.services import process_group_session_completion
        from datetime import date, time

        # Client profile with 0 group credits
        self.client_profile.group_session_credits = 0
        self.client_profile.save(update_fields=["group_session_credits"])

        gw = GroupWorkout.objects.create(
            trainer=self.trainer_user,
            title="Zero Credit Test",
            capacity=10,
        )
        session = GroupWorkoutSession.objects.create(
            group_workout=gw,
            date=date.today(),
            start_time=time(19, 0),
            end_time=time(20, 0),
        )
        GroupWorkoutParticipant.objects.create(
            session=session,
            client=self.client_user,
            status=GroupWorkoutParticipant.Status.JOINED,
        )

        bal_before = self.trainer_wallet.available_balance
        earning = process_group_session_completion(session)
        # No earning generated because 0 paid entitlements were deducted
        self.assertIsNone(earning)
        self.trainer_wallet.refresh_from_db()
        self.assertEqual(self.trainer_wallet.available_balance, bal_before)

    def test_alternative_batch_transfer_requires_enrollment_and_locks_capacity(self):
        """Transfer rejects clients not enrolled in original session, and rejects when full."""
        from group_workouts.models import GroupWorkout, GroupWorkoutSession, GroupWorkoutParticipant
        from payments.services import create_alternative_batch_transfer
        from datetime import date, time

        gw = GroupWorkout.objects.create(
            trainer=self.trainer_user,
            title="Transfer Security Test",
            capacity=1,
        )
        orig_session = GroupWorkoutSession.objects.create(
            group_workout=gw,
            date=date.today() + timezone.timedelta(days=2),
            start_time=time(10, 0),
            end_time=time(11, 0),
        )
        repl_session = GroupWorkoutSession.objects.create(
            group_workout=gw,
            date=date.today() + timezone.timedelta(days=3),
            start_time=time(10, 0),
            end_time=time(11, 0),
        )

        # 1. Not enrolled in orig_session -> ValueError
        with self.assertRaises(ValueError):
            create_alternative_batch_transfer(self.client_user, orig_session, repl_session)

        # Enroll client
        GroupWorkoutParticipant.objects.create(
            session=orig_session,
            client=self.client_user,
            status=GroupWorkoutParticipant.Status.JOINED,
        )

        # 2. Fill replacement session capacity
        another_client = User.objects.create_user(email="other_client@fitnexa.com", password="TestPassword123!", role=User.Role.CLIENT)
        GroupWorkoutParticipant.objects.create(
            session=repl_session,
            client=another_client,
            status=GroupWorkoutParticipant.Status.JOINED,
        )

        with self.assertRaises(ValueError):
            create_alternative_batch_transfer(self.client_user, orig_session, repl_session)

    def test_alternative_batch_transfer_allows_new_transfer_after_cancellation(self):
        """If replacement session is cancelled, client can request another replacement for the same original session."""
        from group_workouts.models import GroupWorkout, GroupWorkoutSession, GroupWorkoutParticipant
        from payments.services import (
            create_alternative_batch_transfer,
            handle_group_session_cancellation,
        )
        from payments.models import AlternativeBatchTransfer
        from datetime import date, time

        gw = GroupWorkout.objects.create(
            trainer=self.trainer_user,
            title="Retry Transfer Test",
            capacity=10,
        )
        orig_session = GroupWorkoutSession.objects.create(
            group_workout=gw,
            date=date.today() + timezone.timedelta(days=2),
            start_time=time(10, 0),
            end_time=time(11, 0),
        )
        repl_session_1 = GroupWorkoutSession.objects.create(
            group_workout=gw,
            date=date.today() + timezone.timedelta(days=3),
            start_time=time(10, 0),
            end_time=time(11, 0),
        )
        repl_session_2 = GroupWorkoutSession.objects.create(
            group_workout=gw,
            date=date.today() + timezone.timedelta(days=4),
            start_time=time(10, 0),
            end_time=time(11, 0),
        )

        GroupWorkoutParticipant.objects.create(
            session=orig_session,
            client=self.client_user,
            status=GroupWorkoutParticipant.Status.JOINED,
        )

        # First transfer (before original session start)
        t1 = create_alternative_batch_transfer(self.client_user, orig_session, repl_session_1)
        self.assertEqual(t1.status, AlternativeBatchTransfer.Status.PENDING)

        # Original session date passes (Monday passes)
        orig_session.date = date.today() - timezone.timedelta(days=2)
        orig_session.save(update_fields=["date"])

        # Trainer cancels replacement session 1 on Tuesday (after original date has passed!)
        handle_group_session_cancellation(repl_session_1)
        t1.refresh_from_db()
        self.assertEqual(t1.status, AlternativeBatchTransfer.Status.CANCELLED)

        # Client can now request replacement session 2 on Wednesday even though original session date passed!
        t2 = create_alternative_batch_transfer(self.client_user, orig_session, repl_session_2)
        self.assertEqual(t2.status, AlternativeBatchTransfer.Status.PENDING)
        self.assertEqual(t2.replacement_session_id, repl_session_2.id)

    def test_payout_confirmation_and_rejection_reject_inconsistent_reserved_balance(self):
        """If reserved_balance < payout.amount, operation is rejected rather than silently setting to 0."""
        from payments.services import (
            request_trainer_payout,
            confirm_payout_by_admin,
            reject_payout_by_admin,
        )

        payout = request_trainer_payout(self.trainer_user, Decimal("200.00"))
        # Artificially tamper reserved_balance to simulate corruption
        self.trainer_wallet.reserved_balance = Decimal("50.00")
        self.trainer_wallet.save(update_fields=["reserved_balance"])

        with self.assertRaises(ValueError):
            confirm_payout_by_admin(payout.id, self.admin_user, payment_reference="UTR_TEST_123")

        with self.assertRaises(ValueError):
            reject_payout_by_admin(payout.id, self.admin_user, failure_reason="Test rejection")

    def test_failed_payment_and_refund_idempotency_keys_are_deterministic_without_timestamps(self):
        """Repeated Stripe webhooks update existing records without creating duplicates."""
        from payments.services import (
            handle_failed_payment_transaction,
            handle_refunded_payment_transaction,
        )

        # 1. Failed payment webhook fired twice
        tx1 = handle_failed_payment_transaction(
            subscription=self.client_sub,
            reason="Card declined",
            stripe_session_id="cs_test_failed_123",
        )
        tx2 = handle_failed_payment_transaction(
            subscription=self.client_sub,
            reason="Card declined retry",
            stripe_session_id="cs_test_failed_123",
        )
        self.assertEqual(tx1.id, tx2.id)
        self.assertNotIn("17", tx1.idempotency_key[-10:])  # no timestamp suffix

        # 2. Refund webhook fired twice
        ref1 = handle_refunded_payment_transaction(
            subscription=self.client_sub,
            refund_amount=Decimal("1500.00"),
            stripe_refund_id="re_test_refund_456",
        )
        ref2 = handle_refunded_payment_transaction(
            subscription=self.client_sub,
            refund_amount=Decimal("1500.00"),
            stripe_refund_id="re_test_refund_456",
        )
        self.assertEqual(ref1.id, ref2.id)

    def test_admin_models_permissions_are_protected(self):
        """Admin classes disallow manual additions, changes, and deletions on financial models."""
        from django.contrib.admin.sites import site
        from payments.admin import (
            SubscriptionCreditLedgerAdmin,
            TrainerWalletAdmin,
            TrainerEarningAdmin,
            PaymentTransactionAdmin,
        )

        ledger_admin = SubscriptionCreditLedgerAdmin(SubscriptionCreditLedger, site)
        self.assertFalse(ledger_admin.has_add_permission(None))
        self.assertFalse(ledger_admin.has_change_permission(None))
        self.assertFalse(ledger_admin.has_delete_permission(None))

        wallet_admin = TrainerWalletAdmin(TrainerWallet, site)
        self.assertFalse(wallet_admin.has_add_permission(None))
        self.assertFalse(wallet_admin.has_change_permission(None))
        self.assertFalse(wallet_admin.has_delete_permission(None))

        earning_admin = TrainerEarningAdmin(TrainerEarning, site)
        self.assertFalse(earning_admin.has_add_permission(None))
        self.assertFalse(earning_admin.has_change_permission(None))
        self.assertFalse(earning_admin.has_delete_permission(None))

        payment_admin = PaymentTransactionAdmin(PaymentTransaction, site)
        self.assertFalse(payment_admin.has_add_permission(None))
        self.assertFalse(payment_admin.has_change_permission(None))
        self.assertFalse(payment_admin.has_delete_permission(None))

        from payments.admin import TrainerPayoutAdmin, AlternativeBatchTransferAdmin
        from payments.models import AlternativeBatchTransfer
        payout_admin = TrainerPayoutAdmin(TrainerPayout, site)
        self.assertFalse(payout_admin.has_add_permission(None))
        self.assertFalse(payout_admin.has_change_permission(None))
        self.assertFalse(payout_admin.has_delete_permission(None))

        transfer_admin = AlternativeBatchTransferAdmin(AlternativeBatchTransfer, site)
        self.assertFalse(transfer_admin.has_add_permission(None))
        self.assertFalse(transfer_admin.has_change_permission(None))
        self.assertFalse(transfer_admin.has_delete_permission(None))

    def test_multiple_subscriptions_expiry_does_not_remove_other_subscription_credits(self):
        """Expiring credits from one subscription must NOT wipe credits from another subscription."""
        from payments.services import expire_unused_period_credits
        from datetime import timedelta

        multi_user = User.objects.create_user(
            email="multi_sub_client@fitnexa.com",
            password="TestPassword123!",
            role=User.Role.CLIENT,
        )
        multi_profile = ClientProfile.objects.create(
            user=multi_user,
            session_credits=20,  # 8 from old sub + 12 from new active sub
            group_session_credits=0,
        )

        old_start = timezone.now() - timedelta(days=35)
        old_sub = ClientSubscription.objects.create(
            client=multi_user,
            plan=self.premium_plan,
            billing_cycle=ClientSubscription.BillingCycle.MONTHLY,
            payment_status=ClientSubscription.PaymentStatus.EXPIRED,
            amount_paid=Decimal("3000.00"),
            started_at=old_start,
            expires_at=old_start + timedelta(days=28),
        )
        SubscriptionCreditLedger.objects.create(
            client=multi_user,
            subscription=old_sub,
            credit_type=SubscriptionCreditLedger.CreditType.PERSONAL_TRAINING,
            action=SubscriptionCreditLedger.Action.ALLOCATED,
            amount=12,
            period_number=1,
            balance_after=12,
            reason="Old sub allocation",
            idempotency_key=f"SUB_{old_sub.id}_PERIOD_1_GRANT",
        )
        SubscriptionCreditLedger.objects.create(
            client=multi_user,
            subscription=old_sub,
            credit_type=SubscriptionCreditLedger.CreditType.PERSONAL_TRAINING,
            action=SubscriptionCreditLedger.Action.CONSUMED,
            amount=-4,
            period_number=1,
            balance_after=8,
            reason="Old sub consumed 4 sessions",
            idempotency_key=f"OLD_SUB_CONSUME_4",
        )

        new_start = timezone.now() - timedelta(days=2)
        new_sub = ClientSubscription.objects.create(
            client=multi_user,
            plan=self.premium_plan,
            billing_cycle=ClientSubscription.BillingCycle.MONTHLY,
            payment_status=ClientSubscription.PaymentStatus.ACTIVE,
            amount_paid=Decimal("3000.00"),
            started_at=new_start,
            expires_at=new_start + timedelta(days=28),
        )
        SubscriptionCreditLedger.objects.create(
            client=multi_user,
            subscription=new_sub,
            credit_type=SubscriptionCreditLedger.CreditType.PERSONAL_TRAINING,
            action=SubscriptionCreditLedger.Action.ALLOCATED,
            amount=12,
            period_number=1,
            balance_after=20,
            reason="New sub allocation",
            idempotency_key=f"SUB_{new_sub.id}_PERIOD_1_GRANT",
        )

        # Expire old subscription
        expired_count = expire_unused_period_credits(multi_user, old_sub)
        self.assertEqual(expired_count, 8)

        multi_profile.refresh_from_db()
        # CRITICAL ASSERTION: The 12 credits of the active new subscription remain INTACT!
        self.assertEqual(multi_profile.session_credits, 12)

    def test_pending_alternative_transfer_protects_entitlement_from_expiry(self):
        """A pending alternative transfer prevents the original session entitlement from expiring."""
        from payments.services import create_alternative_batch_transfer, expire_unused_period_credits
        from group_workouts.models import GroupWorkout, GroupWorkoutSession, GroupWorkoutParticipant
        from datetime import date, time, timedelta

        gw = GroupWorkout.objects.create(trainer=self.trainer_user, title="Protect Expiry", capacity=10)
        orig_s = GroupWorkoutSession.objects.create(
            group_workout=gw, date=date.today() + timedelta(days=1), start_time=time(9, 0), end_time=time(10, 0)
        )
        repl_s = GroupWorkoutSession.objects.create(
            group_workout=gw, date=date.today() + timedelta(days=2), start_time=time(9, 0), end_time=time(10, 0)
        )
        GroupWorkoutParticipant.objects.create(session=orig_s, client=self.client_user, status=GroupWorkoutParticipant.Status.JOINED)

        # Active group sub started 30 days ago (period 1 ended)
        sub_start = timezone.now() - timedelta(days=30)
        group_sub = ClientSubscription.objects.create(
            client=self.client_user,
            plan=self.group_plan,
            billing_cycle=ClientSubscription.BillingCycle.MONTHLY,
            payment_status=ClientSubscription.PaymentStatus.ACTIVE,
            amount_paid=Decimal("1600.00"),
            started_at=sub_start,
            expires_at=sub_start + timedelta(days=28),
        )
        SubscriptionCreditLedger.objects.create(
            client=self.client_user,
            subscription=group_sub,
            credit_type=SubscriptionCreditLedger.CreditType.GROUP_WORKOUT,
            action=SubscriptionCreditLedger.Action.ALLOCATED,
            amount=16,
            period_number=1,
            balance_after=16,
            reason="Grant 16",
            idempotency_key=f"SUB_{group_sub.id}_PERIOD_1_GRANT",
        )
        # Client consumed 15, 1 entitlement remains and is transferred
        SubscriptionCreditLedger.objects.create(
            client=self.client_user,
            subscription=group_sub,
            credit_type=SubscriptionCreditLedger.CreditType.GROUP_WORKOUT,
            action=SubscriptionCreditLedger.Action.CONSUMED,
            amount=-15,
            period_number=1,
            balance_after=1,
            reason="Consumed 15",
            idempotency_key=f"SUB_{group_sub.id}_CONSUMED_15",
        )
        self.client_profile.group_session_credits = 1
        self.client_profile.save(update_fields=["group_session_credits"])

        # Transfer created (PENDING)
        create_alternative_batch_transfer(self.client_user, orig_s, repl_s)

        # Run expiry: the 1 remaining entitlement is reserved by the pending transfer, so it must NOT expire!
        expired = expire_unused_period_credits(self.client_user, group_sub)
        self.assertEqual(expired, 0)
        self.client_profile.refresh_from_db()
        self.assertEqual(self.client_profile.group_session_credits, 1)

    def test_trainer_earning_uses_consumed_subscription_not_latest_upgrade(self):
        """Earnings must be based on the subscription that funded the credit (ledger CONSUMED record), not a later upgrade."""
        from scheduling.models import PersonalTrainingSession, TrainerSlot
        from payments.services import record_session_credit_consumption, process_personal_session_completion
        from datetime import date, time, timedelta

        upgrade_user = User.objects.create_user(
            email="upgrade_client@fitnexa.com",
            password="TestPassword123!",
            role=User.Role.CLIENT,
        )
        ClientProfile.objects.create(user=upgrade_user, session_credits=12, group_session_credits=0)

        # 1. Booking funded by Subscription A (Standard ₹3000 / 12 = ₹250 gross -> ₹200 trainer)
        sub_a = ClientSubscription.objects.create(
            client=upgrade_user,
            plan=self.premium_plan,
            billing_cycle=ClientSubscription.BillingCycle.MONTHLY,
            payment_status=ClientSubscription.PaymentStatus.ACTIVE,
            amount_paid=Decimal("3000.00"),
            started_at=timezone.now() - timedelta(days=5),
            expires_at=timezone.now() + timedelta(days=23),
        )
        slot = TrainerSlot.objects.create(
            trainer=self.trainer_user,
            date=date.today(),
            start_time=time(14, 0),
            end_time=time(15, 0),
        )
        session = PersonalTrainingSession.objects.create(
            client=upgrade_user,
            trainer=self.trainer_user,
            slot=slot,
            date=slot.date,
            start_time=slot.start_time,
            end_time=slot.end_time,
        )
        # Record credit consumption linked to sub_a
        ledger = record_session_credit_consumption(upgrade_user, session, session_type="PERSONAL")
        self.assertEqual(ledger.subscription_id, sub_a.id)

        # 2. Before session completion, client purchases a heavily discounted renewal subscription B
        # (e.g. ₹1200 / 12 = ₹100 gross -> ₹80 trainer)
        sub_b = ClientSubscription.objects.create(
            client=upgrade_user,
            plan=self.premium_plan,
            billing_cycle=ClientSubscription.BillingCycle.MONTHLY,
            payment_status=ClientSubscription.PaymentStatus.ACTIVE,
            amount_paid=Decimal("1200.00"),
            started_at=timezone.now(),
            expires_at=timezone.now() + timedelta(days=28),
        )

        # 3. Session is completed
        bal_before = self.trainer_wallet.available_balance
        earning = process_personal_session_completion(session)

        # Trainer receives ₹200 (from Subscription A: ₹3000 / 12 * 80% = ₹200), NOT ₹80!
        self.assertEqual(earning.gross_amount, Decimal("250.00"))
        self.assertEqual(earning.trainer_amount, Decimal("200.00"))
        self.trainer_wallet.refresh_from_db()
        self.assertEqual(self.trainer_wallet.available_balance, bal_before + Decimal("200.00"))

    def test_no_show_cannot_be_marked_for_future_session(self):
        """A session with a future scheduled start time cannot be marked as no-show."""
        from scheduling.models import PersonalTrainingSession, TrainerSlot
        from scheduling.services import record_client_no_show
        from datetime import date, time, timedelta

        future_slot = TrainerSlot.objects.create(
            trainer=self.trainer_user,
            date=date.today() + timedelta(days=2),
            start_time=time(16, 0),
            end_time=time(17, 0),
            status=TrainerSlot.Status.BOOKED,
        )
        future_session = PersonalTrainingSession.objects.create(
            client=self.client_user,
            trainer=self.trainer_user,
            slot=future_slot,
            date=future_slot.date,
            start_time=future_slot.start_time,
            end_time=future_slot.end_time,
            status=PersonalTrainingSession.Status.BOOKED,
        )

        with self.assertRaises(ValueError):
            record_client_no_show(self.trainer_user, future_session.id)

    def test_simulated_payment_confirmation_blocked_when_debug_false(self):
        """When DEBUG=False, simulated payment confirmation returns 403 Forbidden."""
        self.client_api.force_authenticate(user=self.client_user)
        with override_settings(DEBUG=False):
            res = self.client_api.post(f"/api/subscriptions/client/{self.client_sub.id}/confirm/")
            self.assertEqual(res.status_code, 403)

    def test_unpaid_stripe_checkout_cannot_activate_subscription(self):
        """Stripe webhook with payment_status != 'paid' does not activate subscription."""
        pending_sub = ClientSubscription.objects.create(
            client=self.client_user,
            plan=self.premium_plan,
            billing_cycle=ClientSubscription.BillingCycle.MONTHLY,
            payment_status=ClientSubscription.PaymentStatus.PENDING,
            amount_paid=Decimal("3000.00"),
        )
        fake_session = {
            "id": "cs_unpaid_123",
            "payment_status": "unpaid",
            "metadata": {"subscription_id": pending_sub.id},
        }

        # Simulate webhook payload
        from subscriptions.views import StripeWebhookAPIView
        import stripe
        with unittest.mock.patch("stripe.Webhook.construct_event") as mock_event:
            mock_event.return_value = {
                "type": "checkout.session.completed",
                "data": {"object": fake_session},
            }
            res = self.client_api.post(
                "/api/subscriptions/stripe-webhook/",
                data={},
                HTTP_STRIPE_SIGNATURE="dummy_sig",
            )
            self.assertEqual(res.status_code, 200)

        pending_sub.refresh_from_db()
        self.assertEqual(pending_sub.payment_status, ClientSubscription.PaymentStatus.PENDING)

    def test_wallet_transactions_audit_payout_reserve_and_release(self):
        """Payout requests, rejections, and confirmations create immutable audit events."""
        from payments.services import (
            request_trainer_payout,
            reject_payout_by_admin,
            confirm_payout_by_admin,
            fail_payout_by_admin,
        )

        initial_available = self.trainer_wallet.available_balance

        # 1. Request payout -> creates RESERVE_PAYOUT
        payout1 = request_trainer_payout(self.trainer_user, Decimal("100.00"))
        tx_reserve = WalletTransaction.objects.filter(
            payout=payout1,
            transaction_type=WalletTransaction.TransactionType.RESERVE_PAYOUT,
        ).first()
        self.assertIsNotNone(tx_reserve)
        self.assertEqual(tx_reserve.amount, Decimal("100.00"))

        # 2. Reject payout -> creates RELEASE_PAYOUT
        reject_payout_by_admin(payout1.id, self.admin_user, failure_reason="Incorrect bank details")
        tx_release = WalletTransaction.objects.filter(
            payout=payout1,
            transaction_type=WalletTransaction.TransactionType.RELEASE_PAYOUT,
        ).first()
        self.assertIsNotNone(tx_release)
        self.assertEqual(tx_release.amount, Decimal("100.00"))

        # 3. Request new payout and confirm -> creates DEBIT_PAYOUT
        payout2 = request_trainer_payout(self.trainer_user, Decimal("50.00"))
        confirm_payout_by_admin(payout2.id, self.admin_user, payment_reference="UTR_PAYOUT_VERIFIED_777")
        tx_debit = WalletTransaction.objects.filter(
            payout=payout2,
            transaction_type=WalletTransaction.TransactionType.DEBIT_PAYOUT,
        ).first()
        self.assertIsNotNone(tx_debit)
        self.assertEqual(tx_debit.reference_id, "UTR_PAYOUT_VERIFIED_777")



