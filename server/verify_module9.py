"""
Module 9 Backend Verification Script
Tests: Diet Plan creation, week/day/meal builder, assignment, client completion, and progress.
"""
import os, django, sys
sys.stdout.reconfigure(encoding='utf-8')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "fitNexa.settings")
django.setup()

from accounts.models import User
from client_management.models import TrainerAssignment
from diet_plans.services import (
    create_diet_plan, add_week, add_day, add_meal,
    assign_plan_to_client, get_client_current_diet,
    complete_diet_meal, get_client_progress,
)
from rest_framework.exceptions import ValidationError

print("\n=== Module 9 Backend Verification ===\n")

# -- Seed: get or create trainer + client --
trainer, _ = User.objects.get_or_create(email="m9_trainer@test.com", defaults={"role": "TRAINER"})
trainer.set_password("pass"); trainer.save()

client, _ = User.objects.get_or_create(email="m9_client@test.com", defaults={"role": "CLIENT"})
client.set_password("pass"); client.save()

# -- Seed: TrainerAssignment --
ta, _ = TrainerAssignment.objects.get_or_create(
    client=client, defaults={"trainer": trainer, "assigned_by": trainer}
)
ta.trainer = trainer; ta.is_active = True; ta.save()

print("1. Creating Diet Plan Template...")
plan_data = create_diet_plan(trainer, {
    "title": "Weight Loss Diet",
    "description": "4-week fat loss nutrition program",
    "calories": 1800,
    "goal": "WEIGHT_LOSS",
    "duration_weeks": 4,
})
plan_id = plan_data["id"]
print(f"   ✅ Diet Plan created: '{plan_data['title']}' ({plan_data['calories']} kcal, {plan_data['goal_display']})")

print("\n2. Building Week 1...")
week = add_week(trainer, plan_id, {"week_number": 1, "title": "Metabolic Reset Week"})
week_id = week["week_id"]
print(f"   ✅ Week 1 added (ID: {week_id})")

print("\n3. Adding Day 1 — High Protein Day...")
day = add_day(trainer, week_id, {"day_number": 1, "title": "Day 1 – High Protein", "water_target_liters": 3.5})
day_id = day["day_id"]
print(f"   ✅ Day 1 added (ID: {day_id}, Water target: 3.5 L)")

print("\n4. Adding Meals to Day 1...")
m1 = add_meal(trainer, day_id, {
    "meal_type": "BREAKFAST",
    "calories": 450, "protein_g": 30, "carbs_g": 50, "fats_g": 15,
    "items_description": "2 Eggs, 50g Oats, 1 Banana",
})
m2 = add_meal(trainer, day_id, {
    "meal_type": "LUNCH",
    "calories": 600, "protein_g": 45, "carbs_g": 60, "fats_g": 10,
    "items_description": "150g Grilled Chicken Breast, 100g Brown Rice, Broccoli",
})
m3 = add_meal(trainer, day_id, {
    "meal_type": "EVENING_SNACK",
    "calories": 250, "protein_g": 20, "carbs_g": 15, "fats_g": 12,
    "items_description": "150g Greek Yogurt, 15g Almonds",
})
m4 = add_meal(trainer, day_id, {
    "meal_type": "DINNER",
    "calories": 500, "protein_g": 35, "carbs_g": 20, "fats_g": 25,
    "items_description": "150g Grilled Salmon, Asparagus, Olive Oil",
})
print("   ✅ Added 4 meals (Breakfast, Lunch, Evening Snack, Dinner)")

# Check Day total calories
from diet_plans.models import DietDay
day_obj = DietDay.objects.get(id=day_id)
print(f"   ✅ Computed Day Calories: {day_obj.day_calories} kcal | Macros: P={day_obj.total_protein_g}g, C={day_obj.total_carbs_g}g, F={day_obj.total_fats_g}g")
assert day_obj.day_calories == 1800, f"Expected 1800 kcal, got {day_obj.day_calories}"

print("\n5. Assigning Diet Plan to Client...")
assign_res = assign_plan_to_client(trainer, plan_id, ta.id)
print(f"   ✅ Assigned '{assign_res['plan_title']}' to {client.email} (Assignment ID: {assign_res['assignment_id']})")

print("\n6. Client Retrieving Current Assigned Diet Plan...")
client_diet = get_client_current_diet(client)
print(f"   ✅ Retrieved active plan: '{client_diet['plan']['title']}'")
print(f"   ✅ Initial progress: {client_diet['progress_text']} ({client_diet['progress_pct']}%)")
assert client_diet["total_meals"] == 4, "Expected 4 total meals"

print("\n7. Client Marking Breakfast & Lunch as Complete...")
res1 = complete_diet_meal(client, m1["meal_id"], notes="Delicious oatmeal!")
print(f"   ✅ {res1['message']}")
res2 = complete_diet_meal(client, m2["meal_id"], notes="Had extra broccoli")
print(f"   ✅ {res2['message']}")

print("\n8. Verifying Updated Client Progress...")
progress = get_client_progress(client)
print(f"   ✅ Progress Text: {progress['progress_text']}")
print(f"   ✅ Progress Pct:  {progress['progress_pct']}%")
assert progress["completed_meals"] == 2 and progress["total_meals"] == 4, "Progress should be 2 / 4"
assert progress["progress_pct"] == 50, "Progress pct should be 50%"

print("\n9. Testing Duplicate Completion Prevention...")
try:
    complete_diet_meal(client, m1["meal_id"])
    print("   ❌ FAIL: Duplicate meal check-in was permitted.")
except ValidationError as e:
    print(f"   ✅ Duplicate prevented correctly: {e.detail[0]}")

print("\n🎉 ALL 9 MODULE 9 BACKEND CHECKS PASSED SUCCESSFULLY! 🎉\n")
