from django.contrib import admin
from .models import VideoSession

@admin.register(VideoSession)
class VideoSessionAdmin(admin.ModelAdmin):
    list_display = ('room_name', 'session_type', 'status', 'duration_seconds', 'started_at', 'ended_at')
    list_filter = ('status',)
    search_fields = ('room_name',)
