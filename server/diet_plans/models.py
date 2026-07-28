from django.conf import settings
from django.db import models
from accounts.models import Specialization


class DietPlan(models.Model):
    class GoalType(models.TextChoices):
        WEIGHT_LOSS = "WEIGHT_LOSS", "Weight Loss"
        MUSCLE_GAIN = "MUSCLE_GAIN", "Muscle Gain"
        MAINTENANCE = "MAINTENANCE", "Maintenance"
        ENDURANCE = "ENDURANCE", "Endurance"
        GENERAL = "GENERAL", "General Fitness"

    trainer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_diet_plans",
        limit_choices_to={"role": "TRAINER"},
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    calories = models.PositiveIntegerField(default=1800, help_text="Target daily calories")
    goal = models.CharField(max_length=30, choices=GoalType.choices, default=GoalType.GENERAL)
    duration_weeks = models.PositiveIntegerField(default=4)
    specialization = models.ForeignKey(
        Specialization,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diet_plans",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Diet Plan"
        verbose_name_plural = "Diet Plans"

    def __str__(self):
        return f"{self.title} ({self.get_goal_display()})"


class DietWeek(models.Model):
    plan = models.ForeignKey(
        DietPlan,
        on_delete=models.CASCADE,
        related_name="weeks",
    )
    week_number = models.PositiveIntegerField(default=1)
    title = models.CharField(max_length=100, blank=True, default="")

    class Meta:
        ordering = ["week_number"]
        unique_together = ["plan", "week_number"]

    def __str__(self):
        return f"{self.plan.title} - Week {self.week_number}"


class DietDay(models.Model):
    week = models.ForeignKey(
        DietWeek,
        on_delete=models.CASCADE,
        related_name="days",
    )
    day_number = models.PositiveIntegerField(default=1, help_text="Day 1 to 7")
    title = models.CharField(max_length=100, blank=True, default="Day 1")
    is_cheat_day = models.BooleanField(default=False)
    water_target_liters = models.FloatField(default=3.0, help_text="Target daily water intake in liters")

    class Meta:
        ordering = ["day_number"]
        unique_together = ["week", "day_number"]

    def __str__(self):
        return f"{self.week} - Day {self.day_number}"

    @property
    def day_calories(self):
        return sum(meal.calories for meal in self.meals.all())

    @property
    def total_protein_g(self):
        return sum(meal.protein_g for meal in self.meals.all())

    @property
    def total_carbs_g(self):
        return sum(meal.carbs_g for meal in self.meals.all())

    @property
    def total_fats_g(self):
        return sum(meal.fats_g for meal in self.meals.all())


class DietMeal(models.Model):
    class MealType(models.TextChoices):
        BREAKFAST = "BREAKFAST", "Breakfast"
        MID_MORNING = "MID_MORNING", "Mid Morning"
        LUNCH = "LUNCH", "Lunch"
        EVENING_SNACK = "EVENING_SNACK", "Evening Snack"
        DINNER = "DINNER", "Dinner"
        PRE_WORKOUT = "PRE_WORKOUT", "Pre-Workout"
        POST_WORKOUT = "POST_WORKOUT", "Post-Workout"
        OTHER = "OTHER", "Other"

    day = models.ForeignKey(
        DietDay,
        on_delete=models.CASCADE,
        related_name="meals",
    )
    meal_type = models.CharField(
        max_length=30,
        choices=MealType.choices,
        default=MealType.BREAKFAST,
    )
    order = models.PositiveIntegerField(default=1)
    calories = models.PositiveIntegerField(default=450)
    protein_g = models.PositiveIntegerField(default=30)
    carbs_g = models.PositiveIntegerField(default=50)
    fats_g = models.PositiveIntegerField(default=15)
    items_description = models.TextField(help_text="e.g. 2 Eggs, 50g Oats, 1 Banana")
    notes = models.TextField(blank=True, default="")
    recipe_url = models.URLField(blank=True, default="", help_text="Optional link to recipe or preparation instructions")

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.day} - {self.get_meal_type_display()} ({self.calories} kcal)"


class DietAssignment(models.Model):
    plan = models.ForeignKey(
        DietPlan,
        on_delete=models.PROTECT,
        related_name="assignments",
    )
    trainer_assignment = models.ForeignKey(
        "client_management.TrainerAssignment",
        on_delete=models.CASCADE,
        related_name="diet_assignments",
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="diet_assignments_made",
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-assigned_at"]

    def __str__(self):
        return f"{self.trainer_assignment.client.email} -> {self.plan.title}"


class DietProgress(models.Model):
    assignment = models.ForeignKey(
        DietAssignment,
        on_delete=models.CASCADE,
        related_name="progress_records",
    )
    meal = models.ForeignKey(
        DietMeal,
        on_delete=models.CASCADE,
        related_name="completions",
    )
    completed_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        unique_together = ["assignment", "meal"]
        ordering = ["-completed_at"]

    def __str__(self):
        return f"{self.assignment.trainer_assignment.client.email} completed {self.meal}"
