from rest_framework import serializers
from .models import VideoSession

class VideoSessionSerializer(serializers.ModelSerializer):
    session_type = serializers.SerializerMethodField()

    def get_session_type(self, obj):
        return obj.session_type

    class Meta:
        model = VideoSession
        fields = [
            'id', 'session_type', 'status', 'started_at',
            'ended_at', 'duration_seconds', 'room_name',
            'personal_session', 'group_session'
        ]

class VideoSessionJoinResponseSerializer(serializers.Serializer):
    room_name = serializers.CharField()
    server_url = serializers.CharField()
    token = serializers.CharField()

class AdminVideoSessionLogSerializer(serializers.ModelSerializer):
    session_type = serializers.SerializerMethodField()
    trainer_name = serializers.SerializerMethodField()
    participants_info = serializers.SerializerMethodField()

    class Meta:
        model = VideoSession
        fields = [
            'id', 'room_name', 'session_type', 'trainer_name', 
            'participants_info', 'status', 'started_at', 'ended_at', 
            'duration_seconds', 'created_at'
        ]

    def get_session_type(self, obj):
        return obj.session_type

    def get_trainer_name(self, obj):
        if obj.personal_session:
            return obj.personal_session.trainer.email
        elif obj.group_session:
            return obj.group_session.group_workout.trainer.email
        return "Unknown"

    def get_participants_info(self, obj):
        if obj.personal_session:
            return [obj.personal_session.client.email]
        elif obj.group_session:
            return [p.client.email for p in obj.group_session.participants.all()]
        return []
