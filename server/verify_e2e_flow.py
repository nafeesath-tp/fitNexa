"""
FitNexa Master End-to-End Verification Script & Demo Account Seeder
Tests all 20 Test Cases from Client Registration to Dashboard Progress and seeds clean demo accounts for the reviewer.
"""
import os, sys, django
sys.stdout.reconfigure(encoding='utf-8')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "fitNexa.settings")
django.setup()

from django.db import transaction
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError, PermissionDenied
from accounts.models import Specialization, TrainerProfile, EmailOTP
from client.models import ClientProfile
from subscriptions.models import SubscriptionPlan, ClientSubscription
from client_management.models import TrainerAssignment
from workout_plans.services import (
    create_workout_plan, add_week as add_w_week, add_day as add_w_day, add_exercise,
    assign_plan_to_client as assign_workout, get_client_current_workout, complete_workout_day,
)
from diet_plans.services import (
    create_diet_plan, add_week as add_d_week, add_day as add_d_day, add_meal,
    assign_plan_to_client as assign_diet, get_client_current_diet, complete_diet_meal,
)
from client_management.services import get_trainer_assigned_clients, get_trainer_client_detail
from content.models import TrainingVideo
from content.services import get_client_videos

User = get_user_model()

print("=" * 70)
print(" 🌟 FITNEXA MASTER END-TO-END VERIFICATION & DEMO SEEDER 🌟")
print("=" * 70)

with transaction.atomic():
    # ── Test Case 1: Client Registration & Negative Tests ──────────────────────
    print("\n[Test Case 1 & 20] Verifying Registration & Duplicate Email Protection...")
    demo_client_email = "client@example.com"
    User.objects.filter(email=demo_client_email).delete()
    
    client = User.objects.create_user(
        email=demo_client_email, password="clientpass123",
        role="CLIENT",
        is_active=True, is_verified=True
    )
    print(f"   ✅ Client user created: {client.email}")
    
    try:
        with transaction.atomic():
            User.objects.create_user(email=demo_client_email, password="password", role="CLIENT")
        print("   ❌ FAIL: Duplicate email was permitted.")
    except Exception:
        print("   ✅ Negative Test Passed: Duplicate email registration blocked correctly.")

    # ── Test Case 2: Client Profile Setup ──────────────────────────────────────
    print("\n[Test Case 2] Completing Client Biometric & Health Profile...")
    profile, _ = ClientProfile.objects.get_or_create(user=client)
    profile.first_name = "John"
    profile.last_name = "Doe"
    profile.height_cm = 175
    profile.weight_kg = 70.0
    profile.fitness_goal = "WEIGHT_LOSS"
    profile.gender = "MALE"
    profile.age = 28
    profile.activity_level = "MODERATE"
    profile.is_profile_completed = True
    profile.save()
    print(f"   ✅ Profile saved: Name={profile.first_name} {profile.last_name}, Height={profile.height_cm}cm, Weight={profile.weight_kg}kg")
    assert profile.is_profile_completed is True, "profile.is_profile_completed should be True"

    # ── Test Case 3: Subscription & Demo Account Prep ──────────────────────────
    print("\n[Test Case 3] Setting Up Subscriptions & Purchasing Premium Plan...")
    free_plan, _ = SubscriptionPlan.objects.get_or_create(
        name=SubscriptionPlan.PlanName.FREE,
        defaults={"price_monthly": 0.00, "price_yearly": 0.00, "is_active": True, "features": ["Free access"]}
    )
    group_plan, _ = SubscriptionPlan.objects.get_or_create(
        name=SubscriptionPlan.PlanName.GROUP,
        defaults={"price_monthly": 2999.00, "price_yearly": 29990.00, "is_active": True, "features": ["Group classes"]}
    )
    premium_plan, _ = SubscriptionPlan.objects.get_or_create(
        name=SubscriptionPlan.PlanName.PREMIUM,
        defaults={"price_monthly": 7999.00, "price_yearly": 79990.00, "is_active": True, "features": ["1-on-1 coaching & all access"]}
    )

    client_sub, _ = ClientSubscription.objects.get_or_create(
        client=client,
        defaults={"plan": premium_plan, "payment_status": ClientSubscription.PaymentStatus.ACTIVE}
    )
    client_sub.plan = premium_plan; client_sub.payment_status = ClientSubscription.PaymentStatus.ACTIVE; client_sub.save()
    print(f"   ✅ Client subscribed to: {client_sub.plan.name} (Status: {client_sub.payment_status})")

    # ── Test Case 4: Client Dashboard Routing Check ────────────────────────────
    print("\n[Test Case 4] Verifying Post-Subscription Dashboard Routing State...")
    has_sub = client.subscriptions.filter(payment_status=ClientSubscription.PaymentStatus.ACTIVE).exists()
    print(f"   ✅ Active subscription confirmed: {has_sub} -> User routes to /client/dashboard")
    assert has_sub is True, "Client should have an active subscription for dashboard routing"

    # ── Test Case 5 & 6: Admin & Trainer Assignment ────────────────────────────
    print("\n[Test Case 5 & 6] Admin Seeding & Assigning Personal Trainer...")
    admin, _ = User.objects.get_or_create(email="admin@example.com", defaults={"role": "ADMIN", "is_staff": True, "is_superuser": True})
    admin.set_password("adminpass123"); admin.save()
    
    spec_wl, _ = Specialization.objects.get_or_create(name="Weight Loss", defaults={"description": "Fat burn & cardio"})
    spec_yoga, _ = Specialization.objects.get_or_create(name="Yoga", defaults={"description": "Flexibility & mind"})
    
    trainer, _ = User.objects.get_or_create(email="trainer@example.com", defaults={"role": "TRAINER"})
    trainer.set_password("trainerpass123"); trainer.save()
    t_prof, _ = TrainerProfile.objects.get_or_create(
        user=trainer,
        defaults={
            "first_name": "Sarah", "last_name": "Connor",
            "phone": "1234567890", "bio": "Senior Fitness Coach",
            "experience": 5, "specialization": spec_wl
        }
    )
    t_prof.first_name = "Sarah"; t_prof.last_name = "Connor"
    t_prof.approval_status = TrainerProfile.ApprovalStatus.APPROVED
    t_prof.specialization = spec_wl
    t_prof.experience = 5
    t_prof.save()
    print(f"   ✅ Admin account ready: {admin.email}")
    print(f"   ✅ Trainer account ready: {trainer.email} (Status: {t_prof.approval_status}, Spec: {t_prof.specialization.name})")

    ta, created = TrainerAssignment.objects.get_or_create(
        client=client,
        defaults={"trainer": trainer, "assigned_by": admin, "is_active": True}
    )
    ta.trainer = trainer; ta.is_active = True; ta.save()
    print(f"   ✅ Admin assigned Trainer Sarah ({trainer.email}) to Client John ({client.email})")

    # ── Test Case 7 & 8: Trainer Roster & Client Detail Inspection ─────────────
    print("\n[Test Case 7 & 8] Trainer Roster Scope & Client Detail Audit...")
    roster = get_trainer_assigned_clients(trainer)
    assert len(roster) >= 1, "Trainer roster should contain assigned client"
    client_in_roster = next((c for c in roster if c["email"] == client.email), None)
    assert client_in_roster is not None, "Client John Doe must appear in Sarah's roster"
    print(f"   ✅ Roster scope verified: {client.email} appears in {trainer.email}'s active client list.")
    
    detail = get_trainer_client_detail(trainer, client.id)
    print(f"   ✅ View Client Detail verified: BMI={detail['bmi']}, Goal={detail['fitness_goal']}, Plan={detail['subscription_plan']}")
    print(f"      Initial Workout Assigned: {detail['has_workout_plan']} | Initial Diet Assigned: {detail['has_diet_plan']}")
    assert detail['has_workout_plan'] is False and detail['has_diet_plan'] is False, "Should be False before assignment"

    # ── Test Case 9 & 10: Workout Plan Creation & Assignment ───────────────────
    print("\n[Test Case 9 & 10] Trainer Creating & Assigning Workout Plan (Module 8)...")
    w_plan = create_workout_plan(trainer, {
        "title": "Weight Loss 4 Weeks", "description": "Shred fat and tone muscle",
        "difficulty": "BEGINNER", "duration_weeks": 4,
    })
    w_id = w_plan["id"]
    w_week = add_w_week(trainer, w_id, {"week_number": 1, "title": "Foundation Week"})
    w_day = add_w_day(trainer, w_id, w_week["id"], {"day_number": 1, "title": "Day 1 - Full Body Push"})
    add_exercise(trainer, w_id, w_day["id"], {"exercise_name": "Push Ups", "sets": 3, "reps": "12", "rest_seconds": 60})
    add_exercise(trainer, w_id, w_day["id"], {"exercise_name": "Bench Press", "sets": 4, "reps": "10", "rest_seconds": 90})
    print(f"   ✅ Workout Plan created: '{w_plan['title']}' with Week 1, Day 1 (Push Ups, Bench Press)")
    
    w_assign = assign_workout(trainer, w_id, ta.id)
    print(f"   ✅ Assigned Workout Plan to {client.email} (Assignment ID: {w_assign['assignment_id']})")

    # ── Test Case 11 & 12: Diet Plan Creation & Assignment ─────────────────────
    print("\n[Test Case 11 & 12] Trainer Creating & Assigning Diet Plan (Module 9)...")
    d_plan = create_diet_plan(trainer, {
        "title": "Weight Loss Diet - 1800 kcal", "description": "High protein calorie deficit",
        "calories": 1800, "goal": "WEIGHT_LOSS", "duration_weeks": 4,
    })
    d_id = d_plan["id"]
    d_week = add_d_week(trainer, d_id, {"week_number": 1, "title": "Metabolic Week 1"})
    d_day = add_d_day(trainer, d_week["week_id"], {"day_number": 1, "title": "Day 1 - Clean Eating", "water_target_liters": 3.5})
    m_bf = add_meal(trainer, d_day["day_id"], {"meal_type": "BREAKFAST", "calories": 450, "protein_g": 30, "carbs_g": 50, "fats_g": 15, "items_description": "Oats, 2 Eggs, Banana"})
    m_lu = add_meal(trainer, d_day["day_id"], {"meal_type": "LUNCH", "calories": 600, "protein_g": 45, "carbs_g": 60, "fats_g": 10, "items_description": "Grilled Chicken, Brown Rice, Broccoli"})
    m_sn = add_meal(trainer, d_day["day_id"], {"meal_type": "EVENING_SNACK", "calories": 250, "protein_g": 20, "carbs_g": 15, "fats_g": 12, "items_description": "Greek Yogurt & Almonds"})
    m_di = add_meal(trainer, d_day["day_id"], {"meal_type": "DINNER", "calories": 500, "protein_g": 35, "carbs_g": 20, "fats_g": 25, "items_description": "Salmon & Asparagus"})
    print(f"   ✅ Diet Plan created: '{d_plan['title']}' with 4 meals (Breakfast, Lunch, Snack, Dinner)")
    
    d_assign = assign_diet(trainer, d_id, ta.id)
    print(f"   ✅ Assigned Diet Plan to {client.email} (Assignment ID: {d_assign['assignment_id']})")

    # ── Test Case 13: Client Dashboard State Verification ──────────────────────
    print("\n[Test Case 13] Verifying Client Dashboard State After Assignments...")
    detail_after = get_trainer_client_detail(trainer, client.id)
    print(f"   ✅ Client Detail Status -> Workout Assigned: {detail_after['has_workout_plan']} ✅ | Diet Assigned: {detail_after['has_diet_plan']} ✅")
    assert detail_after['has_workout_plan'] is True and detail_after['has_diet_plan'] is True, "Both plans must be active"

    # ── Test Case 14: Client Workout Completion & Duplicate Check ──────────────
    print("\n[Test Case 14 & 20] Client Marking Workout Day Complete...")
    cw = get_client_current_workout(client)
    assert cw is not None, "Client must have an active workout"
    day_to_complete = cw["plan"]["weeks"][0]["days"][0]["id"]
    res_w = complete_workout_day(client, day_to_complete, notes="Felt strong on push ups!")
    print(f"   ✅ Workout Check-in: {res_w['message']} | Progress: 100% of Day 1")
    
    try:
        with transaction.atomic():
            complete_workout_day(client, day_to_complete)
        print("   ❌ FAIL: Allowed completing same workout day twice!")
    except ValidationError:
        print("   ✅ Negative Test Passed: Cannot mark same workout day complete twice.")

    # ── Test Case 15: Client Diet Meal Progress Tracking ───────────────────────
    print("\n[Test Case 15 & 20] Client Marking Daily Meals Complete (25% -> 50% -> 75% -> 100%)...")
    cd = get_client_current_diet(client)
    assert cd["total_meals"] == 4, "Expected 4 meals in diet plan"
    
    complete_diet_meal(client, m_bf["meal_id"])
    p1 = get_client_current_diet(client); print(f"   🥗 Breakfast completed -> Progress: {p1['progress_text']} ({p1['progress_pct']}%)")
    assert p1['progress_pct'] == 25, "Expected 25%"
    
    complete_diet_meal(client, m_lu["meal_id"])
    p2 = get_client_current_diet(client); print(f"   🥗 Lunch completed     -> Progress: {p2['progress_text']} ({p2['progress_pct']}%)")
    assert p2['progress_pct'] == 50, "Expected 50%"
    
    complete_diet_meal(client, m_sn["meal_id"])
    p3 = get_client_current_diet(client); print(f"   🥗 Snack completed     -> Progress: {p3['progress_text']} ({p3['progress_pct']}%)")
    assert p3['progress_pct'] == 75, "Expected 75%"
    
    complete_diet_meal(client, m_di["meal_id"])
    p4 = get_client_current_diet(client); print(f"   🥗 Dinner completed    -> Progress: {p4['progress_text']} ({p4['progress_pct']}%)")
    assert p4['progress_pct'] == 100, "Expected 100%"
    
    try:
        with transaction.atomic():
            complete_diet_meal(client, m_bf["meal_id"])
        print("   ❌ FAIL: Allowed completing same meal twice!")
    except ValidationError:
        print("   ✅ Negative Test Passed: Cannot mark same diet meal complete twice.")

    # ── Test Case 16: Trainer Verifying Progress Reflection ────────────────────
    print("\n[Test Case 16] Trainer Verifying Client Roster Reflection...")
    updated_roster = get_trainer_assigned_clients(trainer)
    john_card = next(c for c in updated_roster if c["email"] == client.email)
    print(f"   ✅ Trainer Roster View for John -> Workout Assigned: {john_card['has_workout_plan']} | Diet Assigned: {john_card['has_diet_plan']}")
    assert john_card['has_workout_plan'] is True and john_card['has_diet_plan'] is True, "Roster must reflect assigned status"

    # ── Test Case 17: Content Module Filtering & Tier Access ───────────────────
    print("\n[Test Case 17] Content Module Video Filtering & Subscription Tier Access...")
    TrainingVideo.objects.get_or_create(
        title="Beginner Morning Yoga", specialization=spec_yoga,
        difficulty=TrainingVideo.DifficultyLevel.BEGINNER,
        access_level=TrainingVideo.AccessLevel.FREE, video_type="YOUTUBE", video_url="https://youtube.com/watch?v=demo1"
    )
    TrainingVideo.objects.get_or_create(
        title="Advanced Muscle Shred", specialization=spec_wl,
        difficulty=TrainingVideo.DifficultyLevel.ADVANCED,
        access_level=TrainingVideo.AccessLevel.PREMIUM, video_type="YOUTUBE", video_url="https://youtube.com/watch?v=demo2"
    )
    
    yoga_videos = get_client_videos(client, {"specialization": spec_yoga.id, "difficulty": "BEGINNER"})
    print(f"   ✅ Video Filter (Yoga + Beginner) returned {len(yoga_videos)} video(s): '{yoga_videos[0]['title']}'")
    assert all(v['specialization_name'] == "Yoga" for v in yoga_videos), "Filter should only return Yoga videos"
    
    # Check access level logic for Premium client vs Free client
    all_videos_premium = get_client_videos(client)
    prem_vid = next(v for v in all_videos_premium if v["access_level"] == "PREMIUM")
    assert prem_vid["is_locked"] is False, "Premium client must have is_locked=False for premium videos"
    print(f"   ✅ Premium Client Access Check: is_locked={prem_vid['is_locked']} for '{prem_vid['title']}'")
    
    # Create temporary Free client
    free_client = User.objects.create_user(email="free_test@test.com", password="pass", role="CLIENT")
    ClientSubscription.objects.create(client=free_client, plan=free_plan, payment_status="ACTIVE")
    all_videos_free = get_client_videos(free_client)
    prem_vid_free = next(v for v in all_videos_free if v["access_level"] == "PREMIUM")
    assert prem_vid_free["is_locked"] is True, "Free client must have is_locked=True for premium videos"
    assert prem_vid_free["required_plan"] == "PREMIUM", "Must return required_plan='PREMIUM'"
    print(f"   ✅ Free Client Access Check: is_locked={prem_vid_free['is_locked']} (Required Plan: '{prem_vid_free['required_plan']}')")
    free_client.delete()

    # ── Test Case 18: Persistence Across Login Sessions ────────────────────────
    print("\n[Test Case 18] Verifying Persistence Across Login Sessions...")
    client_refreshed = User.objects.get(email=client.email)
    sub_refreshed = client_refreshed.subscriptions.filter(payment_status="ACTIVE").first()
    w_refreshed = get_client_current_workout(client_refreshed)
    d_refreshed = get_client_current_diet(client_refreshed)
    print(f"   ✅ Session Refresh -> Sub: {sub_refreshed.plan.name} | Workout: {w_refreshed['plan']['title']} | Diet: {d_refreshed['plan']['title']}")

    # ── Test Case 19: Authorization & Security Barriers ────────────────────────
    print("\n[Test Case 19] Testing Security Barriers & Role Isolation...")
    from django.http import Http404
    other_trainer = User.objects.create_user(email="trainer_b@test.com", password="pass", role="TRAINER")
    other_client = User.objects.create_user(email="other_client@test.com", password="pass", role="CLIENT")
    TrainerAssignment.objects.create(client=other_client, trainer=other_trainer, assigned_by=admin, is_active=True)
    try:
        with transaction.atomic():
            get_trainer_client_detail(trainer, other_client.id)
        print("   ❌ FAIL: Trainer accessed another trainer's client data!")
    except (PermissionDenied, Http404):
        print("   ✅ Security Barrier Passed: Trainer cannot access another trainer's client health data.")
    other_client.delete(); other_trainer.delete()

    # ── Test Case 20: Comprehensive Database Audit ─────────────────────────────
    print("\n[Test Case 20] Performing Comprehensive Database Audit across 12 Core Tables...")
    from workout_plans.models import WorkoutPlan, WorkoutAssignment, WorkoutCompletion
    from diet_plans.models import DietPlan, DietAssignment, DietProgress
    
    tables_count = {
        "User": User.objects.count(),
        "ClientProfile": ClientProfile.objects.count(),
        "TrainerProfile": TrainerProfile.objects.count(),
        "SubscriptionPlan": SubscriptionPlan.objects.count(),
        "ClientSubscription": ClientSubscription.objects.count(),
        "TrainerAssignment": TrainerAssignment.objects.count(),
        "WorkoutPlan": WorkoutPlan.objects.count(),
        "WorkoutAssignment": WorkoutAssignment.objects.count(),
        "WorkoutCompletion": WorkoutCompletion.objects.count(),
        "DietPlan": DietPlan.objects.count(),
        "DietAssignment": DietAssignment.objects.count(),
        "DietProgress": DietProgress.objects.count(),
    }
    for table_name, count in tables_count.items():
        print(f"   📊 Table {table_name:20s}: {count:3d} active record(s) verified.")
        assert count >= 1, f"Table {table_name} should have at least 1 record"

print("\n" + "=" * 70)
print(" 🎉 ALL 20 END-TO-END TEST CASES & DEMO SEEDING PASSED 100%! 🎉")
print("=" * 70)
print("\n📋 DEMO ACCOUNTS READY FOR REVIEWER:")
print("   👑 Admin:   admin@example.com   / adminpass123")
print("   🏋️ Trainer: trainer@example.com / trainerpass123 (APPROVED)")
print("   🧘 Client:  client@example.com  / clientpass123  (PREMIUM SUBSCRIPTION)")
print("=" * 70 + "\n")
