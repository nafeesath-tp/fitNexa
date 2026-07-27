from django.contrib import admin
from .models import TrainingVideo


@admin.register(TrainingVideo)
class TrainingVideoAdmin(admin.ModelAdmin):
    list_display = [
        "title", 
        "specialization", 
        "difficulty", 
        "access_level", 
        "video_type", 
        "duration_minutes", 
        "is_featured", 
        "is_published", 
        "created_at"
    ]
    list_filter = ["access_level", "difficulty", "video_type", "is_published", "is_featured", "specialization"]
    search_fields = ["title", "description"]
    ordering = ["-is_featured", "display_order", "-created_at"]
    readonly_fields = ["created_at", "updated_at"]
