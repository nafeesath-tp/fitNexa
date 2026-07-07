from rest_framework import serializers

from accounts.models import Specialization, TrainerProfile


class TrainerOnboardingSerializer(serializers.Serializer):
    """
    Validates trainer onboarding input only.
    No database operations here — that belongs in the service layer.
    """

    first_name = serializers.CharField(max_length=100)

    last_name = serializers.CharField(max_length=100)

    phone = serializers.CharField(max_length=15)

    bio = serializers.CharField()

    experience = serializers.IntegerField(min_value=0)

    specialization = serializers.PrimaryKeyRelatedField(
        queryset=Specialization.objects.filter(is_active=True)
    )

    profile_image = serializers.ImageField(required=False)

    certificate = serializers.FileField(required=False)


class SpecializationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Specialization
        fields = ["id", "name", "description"]


class TrainerProfileSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for displaying trainer profile data.
    """

    specialization = SpecializationSerializer(read_only=True)

    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = TrainerProfile
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "bio",
            "experience",
            "specialization",
            "profile_image",
            "certificate",
            "approval_status",
            "created_at",
        ]
        read_only_fields = fields
