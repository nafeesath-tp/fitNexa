from rest_framework import serializers
from accounts.models import TrainerProfile, Specialization

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
