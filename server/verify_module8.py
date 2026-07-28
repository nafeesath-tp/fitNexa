"""
Module 8 Backend Verification Script
Tests: Plan creation, week/day/exercise builder, assignment, client completion, and progress.
"""
import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "fitNexa.settings")
django.setup()

from accounts.models import User, Specialization
from client_management.models import TrainerAssignment
from workout_plans.services import (
    create_workout_plan, add_week, add_day, add_exercise,
    assign_plan_to_client, get_client_current_workout,
    complete_workout_day, get_client_progress,
)

print("\n=== Module 8 Backend Verification ===\n")

# -- Seed: get or create trainer + client --
trainer, _ = User.objects.get_or_create(email="m8_trainer@test.com", defaults={"role": "TRAINER"})
trainer.set_password("pass"); trainer.save()

client, _ = User.objects.get_or_create(email="m8_client@test.com", defaults={"role": "CLIENT"})
client.set_password("pass"); client.save()

# -- Seed: TrainerAssignment --
ta, _ = TrainerAssignment.objects.get_or_create(
    client=client, defaults={"trainer": trainer, "assigned_by": trainer}
)
ta.trainer = trainer; ta.is_active = True; ta.save()

print("1. Creating Workout Plan...")
plan_data = create_workout_plan(trainer, {
    "title": "Weight Loss Beginner",
    "description": "4-week beginner fat loss program",
    "difficulty": "BEGINNER",
    "duration_weeks": 4,
})
plan_id = plan_data["id"]
print(f"   ✅ Plan created: '{plan_data['title']}' (ID: {plan_id})")

print("\n2. Building Week 1...")
week = add_week(trainer, plan_id, {"week_number": 1, "title": "Foundation Week"})
week_id = week["id"]
print(f"   ✅ Week 1 added (ID: {week_id})")

print("\n3. Adding Day 1 — Chest & Triceps...")
day = add_day(trainer, plan_id, week_id, {"day_number": 1, "title": "Day 1 – Chest & Triceps"})
day_id = day["id"]
print(f"   ✅ Day 1 added (ID: {day_id})")

print("\n4. Adding Exercises to Day 1...")
ex1 = add_exercise(trainer, plan_id, day_id, {"exercise_name": "Push Ups", "sets": 3, "reps": "12-15", "rest_seconds": 60})
ex2 = add_exercise(trainer, plan_id, day_id, {"exercise_name": "Incline Dumbbell Press", "sets": 3, "reps": "10", "rest_seconds": 90})
ex3 = add_exercise(trainer, plan_id, day_id, {"exercise_name": "Tricep Dips", "sets": 3, "reps": "AMRAP", "rest_seconds": 60})
print(f"   ✅ Added: Push Ups (reps: 12-15), Incline Dumbbell Press (reps: 10), Tricep Dips (reps: AMRAP)")

print("\n5. Adding Day 2 — Rest Day...")
rest_day = add_day(trainer, plan_id, week_id, {"day_number": 2, "title": "Day 2 – Active Rest", "is_rest_day": True})
print(f"   ✅ Rest Day added (ID: {rest_day['id']})")

print("\n6. Assigning Plan to Client via TrainerAssignment...")
assignment = assign_plan_to_client(trainer, plan_id, ta.id)
print(f"   ✅ Assignment created: '{assignment['plan_title']}' → {client.email}")

print("\n7. Client views current workout...")
workout = get_client_current_workout(client)
print(f"   ✅ Plan: {workout['plan']['title']}")
print(f"   Total Days: {workout['total_days']} | Completed: {workout['completed_days']} | Progress: {workout['progress_pct']}%")

print("\n8. Client marks Day 1 as complete...")
result = complete_workout_day(client, day_id, notes="Great session today!")
print(f"   ✅ {result['message']}")

print("\n9. Checking progress after completion...")
progress = get_client_progress(client)
print(f"   Completed: {progress['completed_days']}/{progress['total_days']} days = {progress['progress_pct']}%")

print("\n10. Testing duplicate completion protection...")
try:
    complete_workout_day(client, day_id)
    print("   ❌ ERROR: Duplicate completion was allowed!")
except Exception as e:
    print(f"   ✅ Duplicate blocked correctly: {e}")

print("\n✅ Module 8 Backend Verification: COMPLETE!\n")
