from rest_framework import serializers
from .models import WorkoutPlan, WorkoutWeek, WorkoutDay, WorkoutExercise, WorkoutAssignment, WorkoutCompletion
from client_management.models import TrainerAssignment


# ── Exercise ─────────────────────────────────────────────────────────────────

class WorkoutExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutExercise
        fields = ["id", "exercise_name", "sets", "reps", "rest_seconds", "notes", "demo_video_url", "order"]


class WorkoutExerciseWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutExercise
        fields = ["exercise_name", "sets", "reps", "rest_seconds", "notes", "demo_video_url", "order"]


# ── Day ──────────────────────────────────────────────────────────────────────

class WorkoutDaySerializer(serializers.ModelSerializer):
    exercises = WorkoutExerciseSerializer(many=True, read_only=True)

    class Meta:
        model = WorkoutDay
        fields = ["id", "day_number", "title", "is_rest_day", "exercises"]


class WorkoutDayWriteSerializer(serializers.ModelSerializer):
    exercises = WorkoutExerciseWriteSerializer(many=True, required=False)

    class Meta:
        model = WorkoutDay
        fields = ["day_number", "title", "is_rest_day", "exercises"]


# ── Week ─────────────────────────────────────────────────────────────────────

class WorkoutWeekSerializer(serializers.ModelSerializer):
    days = WorkoutDaySerializer(many=True, read_only=True)

    class Meta:
        model = WorkoutWeek
        fields = ["id", "week_number", "title", "days"]


class WorkoutWeekWriteSerializer(serializers.ModelSerializer):
    days = WorkoutDayWriteSerializer(many=True, required=False)

    class Meta:
        model = WorkoutWeek
        fields = ["week_number", "title", "days"]


# ── Plan (List / Summary) ─────────────────────────────────────────────────────

class WorkoutPlanListSerializer(serializers.ModelSerializer):
    """
    Compact summary for trainer's template library grid card.
    """
    specialization_name = serializers.SerializerMethodField()
    total_exercises     = serializers.IntegerField(read_only=True)
    week_count          = serializers.SerializerMethodField()

    class Meta:
        model = WorkoutPlan
        fields = [
            "id", "title", "description", "difficulty", "duration_weeks",
            "specialization_name", "total_exercises", "week_count",
            "is_active", "created_at",
        ]

    def get_specialization_name(self, obj):
        return obj.specialization.name if obj.specialization else None

    def get_week_count(self, obj):
        return obj.weeks.count()


# ── Plan (Detail — full structure) ───────────────────────────────────────────

class WorkoutPlanDetailSerializer(serializers.ModelSerializer):
    """
    Full nested structure: Plan → Weeks → Days → Exercises.
    Used for plan builder view and client workout view.
    """
    weeks               = WorkoutWeekSerializer(many=True, read_only=True)
    specialization_name = serializers.SerializerMethodField()
    total_exercises     = serializers.IntegerField(read_only=True)

    class Meta:
        model = WorkoutPlan
        fields = [
            "id", "title", "description", "difficulty", "duration_weeks",
            "specialization_name", "total_exercises", "weeks",
            "is_active", "created_at", "updated_at",
        ]

    def get_specialization_name(self, obj):
        return obj.specialization.name if obj.specialization else None


# ── Plan Create / Update ──────────────────────────────────────────────────────

class WorkoutPlanWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutPlan
        fields = ["title", "description", "difficulty", "duration_weeks", "specialization"]


# ── Assignment ────────────────────────────────────────────────────────────────

class WorkoutAssignmentSerializer(serializers.ModelSerializer):
    """
    Used when a trainer assigns a plan to a client.
    Input: { "trainer_assignment_id": 12 }
    """
    trainer_assignment_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = WorkoutAssignment
        fields = ["id", "assigned_at", "is_active", "trainer_assignment_id"]

    def validate_trainer_assignment_id(self, value):
        try:
            ta = TrainerAssignment.objects.get(id=value, is_active=True)
            return ta
        except TrainerAssignment.DoesNotExist:
            raise serializers.ValidationError("Active trainer assignment not found.")


# ── Assignment List (trainer sees assigned plans per client) ──────────────────

class WorkoutAssignmentListSerializer(serializers.ModelSerializer):
    plan_title     = serializers.CharField(source="plan.title", read_only=True)
    plan_difficulty = serializers.CharField(source="plan.get_difficulty_display", read_only=True)
    client_email   = serializers.SerializerMethodField()
    client_name    = serializers.SerializerMethodField()
    progress_pct   = serializers.SerializerMethodField()

    class Meta:
        model = WorkoutAssignment
        fields = [
            "id", "plan_title", "plan_difficulty",
            "client_email", "client_name",
            "progress_pct", "assigned_at", "is_active",
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
        total = WorkoutExercise.objects.filter(day__week__plan=obj.plan).count()
        if total == 0:
            return 0
        completed_days = obj.completions.count()
        total_days = WorkoutDay.objects.filter(week__plan=obj.plan).count()
        if total_days == 0:
            return 0
        return round((completed_days / total_days) * 100)


# ── Client Progress (day completion) ─────────────────────────────────────────

class WorkoutCompletionSerializer(serializers.ModelSerializer):
    day_number = serializers.IntegerField(source="day.day_number", read_only=True)
    day_title  = serializers.CharField(source="day.title", read_only=True)

    class Meta:
        model = WorkoutCompletion
        fields = ["id", "day", "day_number", "day_title", "completed_at", "notes"]


# ── Client: Current Workout with Progress ────────────────────────────────────

class ClientWorkoutCurrentSerializer(serializers.ModelSerializer):
    """
    The client's active assigned workout plan, with full structure and progress.
    """
    plan            = WorkoutPlanDetailSerializer(read_only=True)
    completed_days  = serializers.SerializerMethodField()
    total_days      = serializers.SerializerMethodField()
    progress_pct    = serializers.SerializerMethodField()
    completed_day_ids = serializers.SerializerMethodField()

    class Meta:
        model = WorkoutAssignment
        fields = [
            "id", "plan", "assigned_at",
            "total_days", "completed_days", "progress_pct", "completed_day_ids",
        ]

    def get_total_days(self, obj):
        return WorkoutDay.objects.filter(week__plan=obj.plan).count()

    def get_completed_days(self, obj):
        return obj.completions.count()

    def get_progress_pct(self, obj):
        total = self.get_total_days(obj)
        if total == 0:
            return 0
        completed = self.get_completed_days(obj)
        return round((completed / total) * 100)

    def get_completed_day_ids(self, obj):
        return list(obj.completions.values_list("day_id", flat=True))
