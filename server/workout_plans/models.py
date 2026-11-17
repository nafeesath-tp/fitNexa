from django.db import models
from django.conf import settings
from accounts.models import Specialization
from client_management.models import TrainerAssignment


class WorkoutPlan(models.Model):
    """
    A reusable workout plan template created by a trainer.
    Structured as: Plan → Weeks → Days → Exercises.
    """

    class DifficultyLevel(models.TextChoices):
        BEGINNER     = "BEGINNER",     "Beginner"
        INTERMEDIATE = "INTERMEDIATE", "Intermediate"
        ADVANCED     = "ADVANCED",     "Advanced"

    trainer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workout_plans",
        limit_choices_to={"role": "TRAINER"},
    )
    title          = models.CharField(max_length=200)
    description    = models.TextField(blank=True)
    difficulty     = models.CharField(max_length=20, choices=DifficultyLevel.choices, default=DifficultyLevel.BEGINNER)
    duration_weeks = models.PositiveIntegerField(default=4)
    specialization = models.ForeignKey(
        Specialization,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="workout_plans",
    )
    is_active      = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.get_difficulty_display()}) by {self.trainer.email}"

    @property
    def total_exercises(self):
        return WorkoutExercise.objects.filter(day__week__plan=self).count()


class WorkoutWeek(models.Model):
    """
    One week block inside a WorkoutPlan.
    Example: Week 1, Week 2, …
    """
    plan        = models.ForeignKey(WorkoutPlan, on_delete=models.CASCADE, related_name="weeks")
    week_number = models.PositiveIntegerField()
    title       = models.CharField(max_length=100, blank=True)  # e.g. "Foundation Week"

    class Meta:
        ordering = ["week_number"]
        unique_together = [("plan", "week_number")]

    def __str__(self):
        return f"{self.plan.title} – Week {self.week_number}"


class WorkoutDay(models.Model):
    """
    A single training day inside a WorkoutWeek.
    Example: Day 1 – Chest & Triceps
    """
    week       = models.ForeignKey(WorkoutWeek, on_delete=models.CASCADE, related_name="days")
    day_number = models.PositiveIntegerField()   # 1 = Monday … 7 = Sunday (within the week)
    title      = models.CharField(max_length=150)  # e.g. "Day 1 – Chest & Triceps"
    is_rest_day = models.BooleanField(default=False)

    class Meta:
        ordering = ["day_number"]
        unique_together = [("week", "day_number")]

    def __str__(self):
        return f"{self.week} – Day {self.day_number}: {self.title}"


class WorkoutExercise(models.Model):
    """
    An individual exercise inside a WorkoutDay.
    reps is CharField to support values like "10-12", "AMRAP", "30 sec", "Failure".
    """
    day           = models.ForeignKey(WorkoutDay, on_delete=models.CASCADE, related_name="exercises")
    exercise_name = models.CharField(max_length=200)
    sets          = models.PositiveIntegerField(default=3)
    reps          = models.CharField(max_length=100, default="10")  # e.g. "10", "10-12", "AMRAP", "20s sprint / 40s easy"
    rest_seconds  = models.PositiveIntegerField(default=60)
    notes         = models.TextField(blank=True)
    order         = models.PositiveIntegerField(default=1)

    # Optional: link to a content video from Module 6
    demo_video_url = models.URLField(blank=True, help_text="YouTube or Cloudinary demo link")

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.exercise_name} – {self.sets}×{self.reps}"


class WorkoutAssignment(models.Model):
    """
    Records which WorkoutPlan has been assigned within a TrainerAssignment relationship.
    References TrainerAssignment (Module 7) instead of client+trainer directly,
    preserving domain model consistency.
    """
    plan               = models.ForeignKey(WorkoutPlan, on_delete=models.CASCADE, related_name="assignments")
    trainer_assignment = models.ForeignKey(
        TrainerAssignment,
        on_delete=models.CASCADE,
        related_name="workout_assignments",
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    is_active   = models.BooleanField(default=True)

    class Meta:
        ordering = ["-assigned_at"]

    def __str__(self):
        return f"{self.plan.title} → {self.trainer_assignment.client.email}"

    @property
    def client(self):
        return self.trainer_assignment.client

    @property
    def trainer(self):
        return self.trainer_assignment.trainer


class WorkoutCompletion(models.Model):
    """
    Tracks which days a client has marked as complete.
    unique_together prevents duplicate completions for the same day.
    """
    assignment   = models.ForeignKey(WorkoutAssignment, on_delete=models.CASCADE, related_name="completions")
    day          = models.ForeignKey(WorkoutDay, on_delete=models.CASCADE, related_name="completions")
    completed_at = models.DateTimeField(auto_now_add=True)
    notes        = models.TextField(blank=True)  # e.g. "Felt strong today"

    class Meta:
        unique_together = [("assignment", "day")]
        ordering = ["-completed_at"]

    def __str__(self):
        return f"{self.assignment.plan.title} – Day {self.day.day_number} completed"


class WorkoutGroupAssignment(models.Model):
    """
    Links a WorkoutPlan to a TrainerGroup.
    All members of the group share this workout plan.
    Only one plan per group can be active at a time.
    """
    plan       = models.ForeignKey(
        WorkoutPlan,
        on_delete=models.CASCADE,
        related_name="group_assignments",
    )
    group      = models.ForeignKey(
        "client_management.TrainerGroup",
        on_delete=models.CASCADE,
        related_name="workout_assignments",
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    is_active   = models.BooleanField(default=True)

    class Meta:
        ordering = ["-assigned_at"]

    def __str__(self):
        return f"{self.plan.title} → Group: {self.group.name}"
