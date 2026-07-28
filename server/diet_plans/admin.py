from django.contrib import admin
from .models import DietPlan, DietWeek, DietDay, DietMeal, DietAssignment, DietProgress


class DietMealInline(admin.TabularInline):
    model = DietMeal
    extra = 1


class DietDayInline(admin.TabularInline):
    model = DietDay
    extra = 1


class DietWeekInline(admin.TabularInline):
    model = DietWeek
    extra = 1


@admin.register(DietPlan)
class DietPlanAdmin(admin.ModelAdmin):
    list_display = ("title", "trainer", "calories", "goal", "duration_weeks", "is_active", "created_at")
    list_filter = ("goal", "is_active", "created_at")
    search_fields = ("title", "description", "trainer__email")
    inlines = [DietWeekInline]


@admin.register(DietWeek)
class DietWeekAdmin(admin.ModelAdmin):
    list_display = ("plan", "week_number", "title")
    list_filter = ("plan",)
    inlines = [DietDayInline]


@admin.register(DietDay)
class DietDayAdmin(admin.ModelAdmin):
    list_display = ("week", "day_number", "title", "is_cheat_day", "water_target_liters")
    list_filter = ("is_cheat_day", "week__plan")
    inlines = [DietMealInline]


@admin.register(DietMeal)
class DietMealAdmin(admin.ModelAdmin):
    list_display = ("day", "meal_type", "order", "calories", "protein_g", "carbs_g", "fats_g")
    list_filter = ("meal_type", "day__week__plan")
    search_fields = ("items_description", "notes")


@admin.register(DietAssignment)
class DietAssignmentAdmin(admin.ModelAdmin):
    list_display = ("plan", "trainer_assignment", "assigned_by", "assigned_at", "is_active")
    list_filter = ("is_active", "assigned_at")
    search_fields = ("trainer_assignment__client__email", "plan__title")


@admin.register(DietProgress)
class DietProgressAdmin(admin.ModelAdmin):
    list_display = ("assignment", "meal", "completed_at")
    list_filter = ("completed_at",)
    search_fields = ("assignment__trainer_assignment__client__email",)
