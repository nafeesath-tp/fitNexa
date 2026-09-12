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
