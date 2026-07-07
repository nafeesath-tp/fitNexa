from rest_framework import serializers
from accounts.models import TrainerProfile, Specialization
from client.models import ClientProfile

class AdminSpecializationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialization
        fields = ['id', 'name', 'description', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

class AdminTrainerProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    specialization_name = serializers.CharField(source='specialization.name', read_only=True)
    
    class Meta:
        model = TrainerProfile
        fields = [
            'id',
            'user',
            'email',
            'first_name',
            'last_name',
            'phone',
            'bio',
            'experience',
            'specialization',
            'specialization_name',
            'profile_image',
            'certificate',
            'approval_status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

class AdminTrainerStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainerProfile
        fields = ['approval_status']
        
    def validate_approval_status(self, value):
        if value not in [TrainerProfile.ApprovalStatus.APPROVED, TrainerProfile.ApprovalStatus.REJECTED]:
            raise serializers.ValidationError("Status must be either APPROVED or REJECTED.")
        return value

class AdminClientListSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    name = serializers.SerializerMethodField()

    class Meta:
        model = ClientProfile
        fields = [
            'id',
            'email',
            'name',
            'phone',
            'fitness_goal',
            'experience_level',
            'is_profile_completed',
        ]
        read_only_fields = fields

    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()

class AdminClientDetailSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = ClientProfile
        fields = [
            'id',
            'user',
            'email',
            'first_name',
            'last_name',
            'phone',
            'date_of_birth',
            'gender',
            'fitness_goal',
            'preferred_workout',
            'experience_level',
            'height_cm',
            'weight_kg',
            'target_weight_kg',
            'diet_preference',
            'medical_condition',
            'is_profile_completed',
            'profile_image',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields
