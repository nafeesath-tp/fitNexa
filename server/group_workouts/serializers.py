from rest_framework import serializers
from .models import GroupWorkout, GroupWorkoutSession, GroupWorkoutParticipant
from accounts.models import Specialization


class SpecializationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialization
        fields = ['id', 'name']


class GroupWorkoutParticipantSerializer(serializers.ModelSerializer):
    client_email = serializers.CharField(source='client.email', read_only=True)
    client_name = serializers.SerializerMethodField()

    class Meta:
        model = GroupWorkoutParticipant
        fields = ['id', 'client', 'client_email', 'client_name', 'status', 'booked_at', 'cancelled_at']
        read_only_fields = ['id', 'client', 'client_email', 'client_name', 'status', 'booked_at', 'cancelled_at']

    def get_client_name(self, obj):
        profile = getattr(obj.client, 'clientprofile', None)
        if profile:
            return f"{profile.first_name} {profile.last_name}"
        return obj.client.email


class GroupWorkoutSessionSerializer(serializers.ModelSerializer):
    participant_count = serializers.IntegerField(read_only=True)
    spots_available = serializers.IntegerField(read_only=True)
    capacity = serializers.IntegerField(source='group_workout.capacity', read_only=True)
    is_full = serializers.BooleanField(read_only=True)
    is_joined = serializers.SerializerMethodField()
    # Denormalized fields for easy rendering in client cards
    group_workout_name = serializers.CharField(source='group_workout.title', read_only=True)
    trainer_name = serializers.SerializerMethodField()
    level = serializers.CharField(source='group_workout.level', read_only=True)
    specialization_name = serializers.CharField(source='group_workout.specialization.name', read_only=True, default='')

    class Meta:
        model = GroupWorkoutSession
        fields = ['id', 'group_workout', 'group_workout_name', 'trainer_name', 'level', 'specialization_name',
                  'date', 'start_time', 'end_time', 'status',
                  'capacity', 'participant_count', 'spots_available', 'is_full', 'is_joined', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_is_joined(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.role == 'CLIENT':
            return obj.participants.filter(client=request.user, status='JOINED').exists()
        return False

    def get_trainer_name(self, obj):
        profile = getattr(obj.group_workout.trainer, 'trainer_profile', None)
        if profile:
            return f"{profile.first_name} {profile.last_name}"
        return obj.group_workout.trainer.email


class GroupWorkoutSessionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupWorkoutSession
        fields = ['id', 'date', 'start_time', 'end_time']


class GroupWorkoutSerializer(serializers.ModelSerializer):
    specialization_name = serializers.CharField(source='specialization.name', read_only=True)
    trainer_name = serializers.SerializerMethodField()
    upcoming_sessions_count = serializers.SerializerMethodField()

    class Meta:
        model = GroupWorkout
        fields = ['id', 'trainer', 'trainer_name', 'title', 'specialization', 'specialization_name',
                  'level', 'capacity', 'description', 'is_active', 'upcoming_sessions_count', 'created_at']
        read_only_fields = ['id', 'trainer', 'created_at']

    def get_trainer_name(self, obj):
        profile = getattr(obj.trainer, 'trainer_profile', None)
        if profile:
            return f"{profile.first_name} {profile.last_name}"
        return obj.trainer.email

    def get_upcoming_sessions_count(self, obj):
        import datetime
        return obj.sessions.filter(date__gte=datetime.date.today(), status='SCHEDULED').count()


class AdminGroupWorkoutSessionSerializer(serializers.ModelSerializer):
    """Extended serializer for admin reports."""
    workout_title = serializers.CharField(source='group_workout.title', read_only=True)
    trainer_name = serializers.SerializerMethodField()
    participant_count = serializers.IntegerField(read_only=True)
    capacity = serializers.IntegerField(source='group_workout.capacity', read_only=True)

    class Meta:
        model = GroupWorkoutSession
        fields = ['id', 'workout_title', 'trainer_name', 'date', 'start_time', 'end_time',
                  'status', 'capacity', 'participant_count']

    def get_trainer_name(self, obj):
        profile = getattr(obj.group_workout.trainer, 'trainer_profile', None)
        if profile:
            return f"{profile.first_name} {profile.last_name}"
        return obj.group_workout.trainer.email
