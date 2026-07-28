from django.contrib import admin
from .models import WorkoutPlan, WorkoutWeek, WorkoutDay, WorkoutExercise, WorkoutAssignment, WorkoutCompletion


class WorkoutExerciseInline(admin.TabularInline):
    model = WorkoutExercise
    extra = 1


class WorkoutDayInline(admin.TabularInline):
    model = WorkoutDay
    extra = 1


class WorkoutWeekInline(admin.TabularInline):
    model = WorkoutWeek
    extra = 1


@admin.register(WorkoutPlan)
class WorkoutPlanAdmin(admin.ModelAdmin):
    list_display = ["title", "trainer", "difficulty", "duration_weeks", "is_active", "created_at"]
    list_filter  = ["difficulty", "is_active", "specialization"]
    search_fields = ["title", "trainer__email"]
    inlines = [WorkoutWeekInline]


@admin.register(WorkoutDay)
class WorkoutDayAdmin(admin.ModelAdmin):
    list_display = ["title", "week", "day_number", "is_rest_day"]
    inlines = [WorkoutExerciseInline]


@admin.register(WorkoutAssignment)
class WorkoutAssignmentAdmin(admin.ModelAdmin):
    list_display = ["plan", "get_client", "get_trainer", "is_active", "assigned_at"]
    list_filter  = ["is_active"]

    def get_client(self, obj): return obj.trainer_assignment.client.email
    get_client.short_description = "Client"

    def get_trainer(self, obj): return obj.trainer_assignment.trainer.email
    get_trainer.short_description = "Trainer"


@admin.register(WorkoutCompletion)
class WorkoutCompletionAdmin(admin.ModelAdmin):
    list_display = ["get_client", "get_plan", "day", "completed_at"]

    def get_client(self, obj): return obj.assignment.trainer_assignment.client.email
    get_client.short_description = "Client"

    def get_plan(self, obj): return obj.assignment.plan.title
    get_plan.short_description = "Plan"


admin.site.register(WorkoutWeek)
admin.site.register(WorkoutExercise)
