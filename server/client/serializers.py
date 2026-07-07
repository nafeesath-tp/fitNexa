from datetime import date

from rest_framework import serializers

from .models import ClientProfile


class ClientProfileCreateSerializer(serializers.Serializer):
    """
    Validates input when a client creates their profile for the first time.
    Only first_name and last_name are required; everything else is optional
    so clients can complete their profile incrementally.
    No database operations here — that belongs in the service layer.
    """

    # ── Personal ─────────────────────────────────────────────────────────────

    first_name = serializers.CharField(max_length=100)

    last_name = serializers.CharField(max_length=100)

    phone = serializers.CharField(max_length=15, required=False, allow_blank=True)

    profile_image = serializers.ImageField(required=False, allow_null=True)

    # ── Basic ─────────────────────────────────────────────────────────────────

    date_of_birth = serializers.DateField(required=False, allow_null=True)

    gender = serializers.ChoiceField(
        choices=ClientProfile.Gender.choices,
        required=False,
        allow_blank=True,
    )

    # ── Fitness ───────────────────────────────────────────────────────────────

    fitness_goal = serializers.ChoiceField(
        choices=ClientProfile.FitnessGoal.choices,
        required=False,
        allow_blank=True,
    )

    preferred_workout = serializers.ChoiceField(
        choices=ClientProfile.PreferredWorkout.choices,
        required=False,
        allow_blank=True,
    )

    experience_level = serializers.ChoiceField(
        choices=ClientProfile.ExperienceLevel.choices,
        required=False,
        allow_blank=True,
    )

    # ── Health ────────────────────────────────────────────────────────────────

    height_cm = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        allow_null=True,
        min_value=50,
        max_value=300,
    )

    weight_kg = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        allow_null=True,
        min_value=20,
        max_value=500,
    )

    target_weight_kg = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        allow_null=True,
        min_value=20,
        max_value=500,
    )

    diet_preference = serializers.ChoiceField(
        choices=ClientProfile.DietPreference.choices,
        required=False,
        allow_blank=True,
    )

    medical_condition = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    def validate_date_of_birth(self, value):
        today = date.today()

        if value > today:
            raise serializers.ValidationError(
                "Date of birth cannot be in the future."
            )

        age = (
            today.year - value.year
            - ((today.month, today.day) < (value.month, value.day))
        )
        if age < 10:
            raise serializers.ValidationError(
                "Client must be at least 10 years old."
            )

        return value

    def validate(self, attrs):
        """
        Cross-field validation:
        - target_weight_kg must differ from current weight_kg
          (no point setting a goal identical to current weight).
        """
        weight = attrs.get("weight_kg")
        target = attrs.get("target_weight_kg")

        if weight is not None and target is not None and weight == target:
            raise serializers.ValidationError(
                {"target_weight_kg": "Target weight must differ from current weight."}
            )

        return attrs


class ClientProfileUpdateSerializer(serializers.Serializer):
    """
    Validates input when a client updates an existing profile.
    All fields are optional — supports partial updates (PATCH).
    No database operations here — that belongs in the service layer.
    """

    # ── Personal ─────────────────────────────────────────────────────────────

    first_name = serializers.CharField(max_length=100, required=False)

    last_name = serializers.CharField(max_length=100, required=False)

    phone = serializers.CharField(max_length=15, required=False, allow_blank=True)

    profile_image = serializers.ImageField(required=False, allow_null=True)

    # ── Basic ─────────────────────────────────────────────────────────────────

    date_of_birth = serializers.DateField(required=False, allow_null=True)

    gender = serializers.ChoiceField(
        choices=ClientProfile.Gender.choices,
        required=False,
        allow_blank=True,
    )

    # ── Fitness ───────────────────────────────────────────────────────────────

    fitness_goal = serializers.ChoiceField(
        choices=ClientProfile.FitnessGoal.choices,
        required=False,
        allow_blank=True,
    )

    preferred_workout = serializers.ChoiceField(
        choices=ClientProfile.PreferredWorkout.choices,
        required=False,
        allow_blank=True,
    )

    experience_level = serializers.ChoiceField(
        choices=ClientProfile.ExperienceLevel.choices,
        required=False,
        allow_blank=True,
    )

    # ── Health ────────────────────────────────────────────────────────────────

    height_cm = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        allow_null=True,
        min_value=50,
        max_value=300,
    )

    weight_kg = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        allow_null=True,
        min_value=20,
        max_value=500,
    )

    target_weight_kg = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        allow_null=True,
        min_value=20,
        max_value=500,
    )

    diet_preference = serializers.ChoiceField(
        choices=ClientProfile.DietPreference.choices,
        required=False,
        allow_blank=True,
    )

    medical_condition = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    def validate(self, attrs):
        """
        Cross-field validation:
        - target_weight_kg must differ from current weight_kg.
        """
        weight = attrs.get("weight_kg")
        target = attrs.get("target_weight_kg")

        if weight is not None and target is not None and weight == target:
            raise serializers.ValidationError(
                {"target_weight_kg": "Target weight must differ from current weight."}
            )

        return attrs


class ClientProfileSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for displaying the full client profile.
    Exposes the user's email from the related User model.
    Used in GET responses — never for writes.
    """

    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = ClientProfile
        fields = [
            "id",
            "email",
            # Personal
            "first_name",
            "last_name",
            "phone",
            "profile_image",
            # Basic
            "date_of_birth",
            "gender",
            # Fitness
            "fitness_goal",
            "preferred_workout",
            "experience_level",
            # Health
            "height_cm",
            "weight_kg",
            "target_weight_kg",
            "diet_preference",
            "medical_condition",
            # Metadata
            "is_profile_completed",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
