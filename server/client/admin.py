from django.contrib import admin
from .models import ClientProfile


@admin.register(ClientProfile)
class ClientProfileAdmin(admin.ModelAdmin):
    list_display = [
        "first_name",
        "last_name",
        "user",
        "gender",
        "fitness_goal",
        "experience_level",
        "created_at",
    ]
    list_filter = ["gender", "fitness_goal", "experience_level", "diet_preference"]
    search_fields = ["first_name", "last_name", "user__email"]
    readonly_fields = ["created_at", "updated_at"]
