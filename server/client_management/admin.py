from django.contrib import admin
from .models import TrainerAssignment


@admin.register(TrainerAssignment)
class TrainerAssignmentAdmin(admin.ModelAdmin):
    list_display = ["client", "trainer", "assigned_by", "is_active", "assigned_at"]
    list_filter = ["is_active", "assigned_at"]
    search_fields = ["client__email", "client__first_name", "trainer__email", "trainer__first_name"]
    readonly_fields = ["assigned_at", "updated_at"]
