from rest_framework import serializers
from .models import DietPlan, DietWeek, DietDay, DietMeal, DietAssignment, DietProgress
from client_management.models import TrainerAssignment


# ── Meal ──────────────────────────────────────────────────────────────────────

class DietMealSerializer(serializers.ModelSerializer):
    meal_type_display = serializers.CharField(source="get_meal_type_display", read_only=True)

    class Meta:
        model = DietMeal
        fields = [
            "id", "meal_type", "meal_type_display", "order", "calories",
            "protein_g", "carbs_g", "fats_g", "items_description",
            "notes", "recipe_url",
        ]


# ── Day ───────────────────────────────────────────────────────────────────────

class DietDaySerializer(serializers.ModelSerializer):
    meals = DietMealSerializer(many=True, read_only=True)
    day_calories = serializers.IntegerField(read_only=True)
    total_protein_g = serializers.IntegerField(read_only=True)
    total_carbs_g = serializers.IntegerField(read_only=True)
    total_fats_g = serializers.IntegerField(read_only=True)

    class Meta:
        model = DietDay
        fields = [
            "id", "day_number", "title", "is_cheat_day", "water_target_liters",
            "day_calories", "total_protein_g", "total_carbs_g", "total_fats_g",
            "meals",
        ]


# ── Week ──────────────────────────────────────────────────────────────────────

class DietWeekSerializer(serializers.ModelSerializer):
    days = DietDaySerializer(many=True, read_only=True)

    class Meta:
        model = DietWeek
        fields = ["id", "week_number", "title", "days"]


# ── Plan (List — summary) ────────────────────────────────────────────────────

class DietPlanListSerializer(serializers.ModelSerializer):
    specialization_name = serializers.SerializerMethodField()
    week_count          = serializers.IntegerField(read_only=True)
    meal_count          = serializers.IntegerField(read_only=True)
    goal_display        = serializers.CharField(source="get_goal_display", read_only=True)

    class Meta:
        model = DietPlan
        fields = [
            "id", "title", "description", "calories", "goal", "goal_display",
            "duration_weeks", "specialization_name", "week_count", "meal_count",
            "is_active", "created_at",
        ]

    def get_specialization_name(self, obj):
        return obj.specialization.name if obj.specialization else None


# ── Plan (Detail — full structure) ───────────────────────────────────────────

class DietPlanDetailSerializer(serializers.ModelSerializer):
    """
    Full nested structure: Plan → Weeks → Days → Meals.
    Used for diet builder view and client diet view.
    """
    weeks               = DietWeekSerializer(many=True, read_only=True)
    specialization_name = serializers.SerializerMethodField()
    total_meals         = serializers.IntegerField(read_only=True)
    goal_display        = serializers.CharField(source="get_goal_display", read_only=True)

    class Meta:
        model = DietPlan
        fields = [
            "id", "title", "description", "calories", "goal", "goal_display",
            "duration_weeks", "specialization_name", "total_meals", "weeks",
            "is_active", "created_at", "updated_at",
        ]

    def get_specialization_name(self, obj):
        return obj.specialization.name if obj.specialization else None


# ── Plan Create / Update ──────────────────────────────────────────────────────

class DietPlanWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DietPlan
        fields = ["title", "description", "calories", "goal", "duration_weeks", "specialization"]


# ── Assignment ────────────────────────────────────────────────────────────────

class DietAssignmentSerializer(serializers.ModelSerializer):
    """
    Used when a trainer assigns a diet plan to a client.
    Input: { "trainer_assignment_id": 12 }
    """
    trainer_assignment_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = DietAssignment
        fields = ["id", "assigned_at", "is_active", "trainer_assignment_id"]

    def validate_trainer_assignment_id(self, value):
        try:
            ta = TrainerAssignment.objects.get(id=value, is_active=True)
            return ta
        except TrainerAssignment.DoesNotExist:
            raise serializers.ValidationError("Active trainer assignment not found.")


# ── Assignment List (trainer sees assigned diets per client) ──────────────────

class DietAssignmentListSerializer(serializers.ModelSerializer):
    plan_title   = serializers.CharField(source="plan.title", read_only=True)
    plan_goal    = serializers.CharField(source="plan.get_goal_display", read_only=True)
    client_email = serializers.SerializerMethodField()
    client_name  = serializers.SerializerMethodField()
    progress_pct = serializers.SerializerMethodField()
    progress_text = serializers.SerializerMethodField()

    class Meta:
        model = DietAssignment
        fields = [
            "id", "plan_title", "plan_goal",
            "client_email", "client_name",
            "progress_pct", "progress_text", "assigned_at", "is_active",
        ]

    def get_client_email(self, obj):
        return obj.trainer_assignment.client.email

    def get_client_name(self, obj):
        client = obj.trainer_assignment.client
        tp = getattr(client, "client_profile", None)
        if tp:
            return f"{tp.first_name or ''} {tp.last_name or ''}".strip() or client.email
        return client.email

    def get_progress_pct(self, obj):
        total_meals = DietMeal.objects.filter(day__week__plan=obj.plan).count()
        if total_meals == 0:
            return 0
        completed_meals = obj.progress_records.count()
        return round((completed_meals / total_meals) * 100)

    def get_progress_text(self, obj):
        total_meals = DietMeal.objects.filter(day__week__plan=obj.plan).count()
        completed_meals = obj.progress_records.count()
        return f"{completed_meals} / {total_meals}"


# ── Client Progress (meal completion) ────────────────────────────────────────

class DietProgressSerializer(serializers.ModelSerializer):
    meal_type_display = serializers.CharField(source="meal.get_meal_type_display", read_only=True)
    day_number        = serializers.IntegerField(source="meal.day.day_number", read_only=True)

    class Meta:
        model = DietProgress
        fields = ["id", "meal", "meal_type_display", "day_number", "completed_at", "notes"]


# ── Client: Current Diet with Progress ───────────────────────────────────────

class ClientDietCurrentSerializer(serializers.ModelSerializer):
    """
    The client's active assigned diet plan, with full structure and progress.
    """
    plan               = DietPlanDetailSerializer(read_only=True)
    completed_meals    = serializers.SerializerMethodField()
    total_meals        = serializers.SerializerMethodField()
    progress_pct       = serializers.SerializerMethodField()
    progress_text      = serializers.SerializerMethodField()
    completed_meal_ids = serializers.SerializerMethodField()

    class Meta:
        model = DietAssignment
        fields = [
            "id", "plan", "assigned_at",
            "total_meals", "completed_meals", "progress_pct", "progress_text",
            "completed_meal_ids",
        ]

    def get_total_meals(self, obj):
        return DietMeal.objects.filter(day__week__plan=obj.plan).count()

    def get_completed_meals(self, obj):
        return obj.progress_records.count()

    def get_progress_pct(self, obj):
        total = self.get_total_meals(obj)
        if total == 0:
            return 0
        return round((self.get_completed_meals(obj) / total) * 100)

    def get_progress_text(self, obj):
        total = self.get_total_meals(obj)
        completed = self.get_completed_meals(obj)
        return f"{completed} / {total}"

    def get_completed_meal_ids(self, obj):
        return list(obj.progress_records.values_list("meal_id", flat=True))
