"""chat/admin.py — Register chat models in Django Admin."""
from django.contrib import admin
from .models import Conversation, Message, ChatReport


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['id', 'client', 'trainer', 'created_at', 'updated_at']
    list_filter = ['created_at']
    search_fields = ['client__email', 'trainer__email']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'conversation', 'sender', 'content_preview', 'is_read', 'created_at']
    list_filter = ['is_read', 'created_at']
    search_fields = ['sender__email', 'content']

    def content_preview(self, obj):
        return obj.content[:60] if obj.content else '[file]'
    content_preview.short_description = 'Content'


@admin.register(ChatReport)
class ChatReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'message', 'reported_by', 'status', 'reviewed_by', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['reported_by__email', 'reason']
