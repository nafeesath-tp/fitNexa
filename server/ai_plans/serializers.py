from rest_framework import serializers
from .models import AIPlanRequest
from workout_plans.serializers import WorkoutPlanDetailSerializer
from diet_plans.serializers import DietPlanDetailSerializer


class AIPlanRequestCreateSerializer(serializers.Serializer):
    """Input: client submits AI questionnaire."""
    workout_days_per_week    = serializers.IntegerField(min_value=2, max_value=7)
    session_duration_minutes = serializers.ChoiceField(choices=[30, 45, 60, 90])
    workout_location         = serializers.ChoiceField(choices=["HOME", "GYM", "OUTDOOR"])
    equipment                = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    physical_limitations     = serializers.CharField(allow_blank=True, default="None")
    sleep_hours              = serializers.FloatField(min_value=4, max_value=12)
    stress_level             = serializers.IntegerField(min_value=1, max_value=5)
    meals_per_day            = serializers.IntegerField(min_value=2, max_value=6)
    water_target_liters      = serializers.FloatField(min_value=1, max_value=6)
    food_dislikes_allergies  = serializers.CharField(allow_blank=True, default="None")
    # For week 2+ only: client provides feedback on previous week
    feedback                 = serializers.CharField(allow_blank=True, required=False, default="")


class AIPlanRequestListSerializer(serializers.ModelSerializer):
    """Summary for listing requests."""
    client_email  = serializers.EmailField(source="client.email")
    trainer_email = serializers.EmailField(source="trainer.email", default="")
    workout_plan_title = serializers.SerializerMethodField()
    diet_plan_title    = serializers.SerializerMethodField()

    class Meta:
        model  = AIPlanRequest
        fields = [
            "id", "client_email", "trainer_email",
            "week_number", "status",
            "workout_plan_title", "diet_plan_title",
            "created_at", "updated_at",
        ]

    def get_workout_plan_title(self, obj):
        return obj.workout_plan.title if obj.workout_plan else None

    def get_diet_plan_title(self, obj):
        return obj.diet_plan.title if obj.diet_plan else None


class AIPlanRequestDetailSerializer(serializers.ModelSerializer):
    """Full detail including nested plans for trainer review."""
    client_email  = serializers.EmailField(source="client.email")
    trainer_email = serializers.EmailField(source="trainer.email", default="")
    workout_plan  = serializers.SerializerMethodField()
    diet_plan     = serializers.SerializerMethodField()

    class Meta:
        model  = AIPlanRequest
        fields = [
            "id", "client_email", "trainer_email",
            "week_number", "questionnaire", "previous_progress",
            "status", "error_message",
            "workout_plan", "diet_plan",
            "created_at", "updated_at",
        ]

    def get_workout_plan(self, obj):
        if obj.workout_plan:
            return WorkoutPlanDetailSerializer(obj.workout_plan).data
        return None

    def get_diet_plan(self, obj):
        if obj.diet_plan:
            return DietPlanDetailSerializer(obj.diet_plan).data
        return None
