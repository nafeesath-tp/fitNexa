"""
chat/serializers.py
"""
from rest_framework import serializers
from .models import Conversation, Message, ChatReport
from django.contrib.auth import get_user_model

User = get_user_model()


class UserBriefSerializer(serializers.ModelSerializer):
    """Minimal user info for embedding in chat responses."""
    name = serializers.SerializerMethodField()

    def get_name(self, obj):
        for attr in ['full_name', 'name', 'first_name']:
            val = getattr(obj, attr, None)
            if val:
                return val
        for rel in ['trainer_profile', 'client_profile']:
            try:
                profile = getattr(obj, rel)
                for pattr in ['full_name', 'name', 'first_name']:
                    val = getattr(profile, pattr, None)
                    if val:
                        return val
            except Exception:
                pass
        return obj.email.split('@')[0]

    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'role']


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)
    sender_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    def get_sender_name(self, obj):
        return UserBriefSerializer().get_name(obj.sender)

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

    class Meta:
        model = Message
        fields = [
            'id', 'sender_id', 'sender_name',
            'content', 'file_url', 'file_name',
            'is_read', 'created_at',
        ]


class ConversationListSerializer(serializers.ModelSerializer):
    """Used in conversation list — includes other_user info, unread count, last message."""
    other_user = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    def get_other_user(self, obj):
        request = self.context.get('request')
        other = obj.get_other_user(request.user)
        return UserBriefSerializer(other).data

    def get_unread_count(self, obj):
        request = self.context.get('request')
        return obj.unread_count_for(request.user)

    def get_last_message(self, obj):
        msg = obj.last_message()
        if msg:
            return {
                'content': msg.content or ('📎 ' + msg.file_name if msg.file_name else ''),
                'created_at': msg.created_at.isoformat(),
                'sender_id': msg.sender_id,
            }
        return None

    class Meta:
        model = Conversation
        fields = ['id', 'other_user', 'unread_count', 'last_message', 'updated_at']


class ConversationDetailSerializer(serializers.ModelSerializer):
    client = UserBriefSerializer(read_only=True)
    trainer = UserBriefSerializer(read_only=True)

    class Meta:
        model = Conversation
        fields = ['id', 'client', 'trainer', 'created_at', 'updated_at']


class ChatReportSerializer(serializers.ModelSerializer):
    message_content = serializers.CharField(source='message.content', read_only=True)
    reported_by_email = serializers.EmailField(source='reported_by.email', read_only=True)
    reviewed_by_email = serializers.EmailField(source='reviewed_by.email', read_only=True, allow_null=True)

    class Meta:
        model = ChatReport
        fields = [
            'id', 'message', 'message_content',
            'reported_by', 'reported_by_email',
            'reason', 'status',
            'reviewed_by', 'reviewed_by_email', 'reviewed_at',
            'created_at',
        ]
        read_only_fields = ['reported_by', 'reviewed_by', 'reviewed_at', 'status']
