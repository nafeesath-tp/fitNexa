from rest_framework import serializers
from django.utils import timezone
from accounts.models import User
from .models import TrainerAssignment


def get_client_plan_name(client_user):
    try:
        from subscriptions.models import ClientSubscription
        sub = ClientSubscription.objects.filter(
            client=client_user, 
            payment_status=ClientSubscription.PaymentStatus.ACTIVE
        ).order_by("-created_at").first()
        if sub and (not sub.expires_at or sub.expires_at > timezone.now()):
            return sub.plan.name.upper()
    except Exception:
        pass
    return "FREE"


def get_profile_attr(user, attr_name, default=""):
    if hasattr(user, "client_profile"):
        return getattr(user.client_profile, attr_name, default)
    if hasattr(user, "trainer_profile"):
        return getattr(user.trainer_profile, attr_name, default)
    return default


class AdminClientAssignmentListSerializer(serializers.ModelSerializer):
    """
    Serializer for Admin dashboard showing all clients with their active subscription
    and current assigned trainer badge.
    """
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    phone_number = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()
    subscription_plan = serializers.SerializerMethodField()
    assigned_trainer = serializers.SerializerMethodField()
    is_assigned = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "profile_picture",
            "subscription_plan",
            "assigned_trainer",
            "is_assigned",
            "created_at",
        ]

    def get_first_name(self, obj):
        return get_profile_attr(obj, "first_name", "")

    def get_last_name(self, obj):
        return get_profile_attr(obj, "last_name", "")

    def get_phone_number(self, obj):
        return get_profile_attr(obj, "phone", "")

    def get_profile_picture(self, obj):
        img = get_profile_attr(obj, "profile_image", None)
        if img and hasattr(img, "url"):
            return img.url
        return None

    def get_subscription_plan(self, obj):
        return get_client_plan_name(obj)

    def get_assigned_trainer(self, obj):
        if hasattr(obj, "trainer_assignment") and obj.trainer_assignment.is_active:
            t = obj.trainer_assignment.trainer
            spec_name = None
            if hasattr(t, "trainer_profile") and t.trainer_profile.specialization:
                spec_name = t.trainer_profile.specialization.name
            return {
                "id": t.id,
                "email": t.email,
                "first_name": get_profile_attr(t, "first_name", ""),
                "last_name": get_profile_attr(t, "last_name", ""),
                "specialization": spec_name,
                "assigned_at": obj.trainer_assignment.assigned_at,
            }
        return None

    def get_is_assigned(self, obj):
        return hasattr(obj, "trainer_assignment") and obj.trainer_assignment.is_active


class AssignTrainerSerializer(serializers.Serializer):
    """
    Input validation for assigning or reassigning a trainer to a client.
    """
    client_id = serializers.IntegerField(required=True)
    trainer_id = serializers.IntegerField(required=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_client_id(self, value):
        try:
            client = User.objects.get(id=value, role=User.Role.CLIENT)
            return client
        except User.DoesNotExist:
            raise serializers.ValidationError("Client not found or user is not a Client.")

    def validate_trainer_id(self, value):
        try:
            trainer = User.objects.get(id=value, role=User.Role.TRAINER)
            if not hasattr(trainer, "trainer_profile") or trainer.trainer_profile.approval_status != "APPROVED":
                raise serializers.ValidationError("Trainer is not approved yet.")
            return trainer
        except User.DoesNotExist:
            raise serializers.ValidationError("Trainer not found or user is not a Trainer.")


class TrainerClientListSerializer(serializers.ModelSerializer):
    """
    Serializer for Trainer 'My Clients' dashboard grid.
    Returns client health summary, fitness goal, BMI, and plan tier.
    """
    assignment_id = serializers.IntegerField(source="id", read_only=True)
    client_id = serializers.IntegerField(source="client.id", read_only=True)
    email = serializers.EmailField(source="client.email", read_only=True)
    
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    phone_number = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()
    goal = serializers.SerializerMethodField()
    bmi = serializers.SerializerMethodField()
    subscription_plan = serializers.SerializerMethodField()
    has_workout_plan = serializers.SerializerMethodField()
    has_diet_plan = serializers.SerializerMethodField()

    class Meta:
        model = TrainerAssignment
        fields = [
            "assignment_id",
            "client_id",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "profile_picture",
            "goal",
            "bmi",
            "subscription_plan",
            "has_workout_plan",
            "has_diet_plan",
            "assigned_at",
        ]

    def get_first_name(self, obj):
        return get_profile_attr(obj.client, "first_name", "")

    def get_last_name(self, obj):
        return get_profile_attr(obj.client, "last_name", "")

    def get_phone_number(self, obj):
        return get_profile_attr(obj.client, "phone", "")

    def get_profile_picture(self, obj):
        img = get_profile_attr(obj.client, "profile_image", None)
        if img and hasattr(img, "url"):
            return img.url
        return None

    def get_goal(self, obj):
        if hasattr(obj.client, "client_profile") and obj.client.client_profile.fitness_goal:
            return obj.client.client_profile.get_fitness_goal_display()
        return "General Fitness"

    def get_bmi(self, obj):
        if hasattr(obj.client, "client_profile"):
            p = obj.client.client_profile
            if p.height_cm and p.weight_kg and float(p.height_cm) > 0:
                h_m = float(p.height_cm) / 100.0
                return round(float(p.weight_kg) / (h_m * h_m), 1)
        return None

    def get_subscription_plan(self, obj):
        return get_client_plan_name(obj.client)

    def get_has_workout_plan(self, obj):
        try:
            from workouts.models import WorkoutPlan
            return WorkoutPlan.objects.filter(client=obj.client, is_active=True).exists()
        except Exception:
            return False

    def get_has_diet_plan(self, obj):
        try:
            from diets.models import DietPlan
            return DietPlan.objects.filter(client=obj.client, is_active=True).exists()
        except Exception:
            return False


class TrainerClientDetailSerializer(serializers.ModelSerializer):
    """
    Exhaustive health profile for Trainer deep-dive into an assigned client.
    Prepares data for Module 8 (Workout Plans) and Module 9 (Diet Plans).
    """
    client_id = serializers.IntegerField(source="client.id", read_only=True)
    email = serializers.EmailField(source="client.email", read_only=True)
    
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    phone_number = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()
    
    height_cm = serializers.SerializerMethodField()
    weight_kg = serializers.SerializerMethodField()
    bmi = serializers.SerializerMethodField()
    fitness_goal = serializers.SerializerMethodField()
    activity_level = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()
    gender = serializers.SerializerMethodField()
    medical_conditions = serializers.SerializerMethodField()
    subscription_plan = serializers.SerializerMethodField()
    has_workout_plan = serializers.SerializerMethodField()
    has_diet_plan = serializers.SerializerMethodField()

    class Meta:
        model = TrainerAssignment
        fields = [
            "id",
            "client_id",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "profile_picture",
            "height_cm",
            "weight_kg",
            "bmi",
            "fitness_goal",
            "activity_level",
            "age",
            "gender",
            "medical_conditions",
            "subscription_plan",
            "has_workout_plan",
            "has_diet_plan",
            "assigned_at",
            "notes",
        ]

    def get_first_name(self, obj):
        return get_profile_attr(obj.client, "first_name", "")

    def get_last_name(self, obj):
        return get_profile_attr(obj.client, "last_name", "")

    def get_phone_number(self, obj):
        return get_profile_attr(obj.client, "phone", "")

    def get_profile_picture(self, obj):
        img = get_profile_attr(obj.client, "profile_image", None)
        if img and hasattr(img, "url"):
            return img.url
        return None

    def _get_profile(self, obj):
        return getattr(obj.client, "client_profile", None)

    def get_height_cm(self, obj):
        p = self._get_profile(obj)
        return float(p.height_cm) if p and p.height_cm else None

    def get_weight_kg(self, obj):
        p = self._get_profile(obj)
        return float(p.weight_kg) if p and p.weight_kg else None

    def get_bmi(self, obj):
        p = self._get_profile(obj)
        if p and p.height_cm and p.weight_kg and float(p.height_cm) > 0:
            h_m = float(p.height_cm) / 100.0
            return round(float(p.weight_kg) / (h_m * h_m), 1)
        return None

    def get_fitness_goal(self, obj):
        p = self._get_profile(obj)
        return p.get_fitness_goal_display() if p and p.fitness_goal else "General Fitness"

    def get_activity_level(self, obj):
        p = self._get_profile(obj)
        return p.get_activity_level_display() if p and p.activity_level else "Moderate"

    def get_age(self, obj):
        p = self._get_profile(obj)
        return p.age if p else None

    def get_gender(self, obj):
        p = self._get_profile(obj)
        return p.get_gender_display() if p and p.gender else None

    def get_medical_conditions(self, obj):
        p = self._get_profile(obj)
        return p.medical_conditions if p else ""

    def get_subscription_plan(self, obj):
        return get_client_plan_name(obj.client)

    def get_has_workout_plan(self, obj):
        try:
            from workouts.models import WorkoutPlan
            return WorkoutPlan.objects.filter(client=obj.client, is_active=True).exists()
        except Exception:
            return False

    def get_has_diet_plan(self, obj):
        try:
            from diets.models import DietPlan
            return DietPlan.objects.filter(client=obj.client, is_active=True).exists()
        except Exception:
            return False
