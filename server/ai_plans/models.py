from django.db import models
from django.conf import settings
from django.utils import timezone


class AIPlanRequest(models.Model):
    """
    Records an AI plan generation request for a Premium client.
    
    Flow:
        Client submits questionnaire → PENDING
        Background call to Gemini  → GENERATED
        Trainer reviews/edits       → TRAINER_REVIEWED
        Trainer assigns to client   → ASSIGNED
    """

    class Status(models.TextChoices):
        PENDING          = "PENDING",          "Pending Generation"
        GENERATING       = "GENERATING",       "Generating…"
        GENERATED        = "GENERATED",        "Generated – Awaiting Trainer"
        GENERATION_FAILED = "GENERATION_FAILED", "Generation Failed"
        TRAINER_REVIEWED = "TRAINER_REVIEWED", "Trainer Reviewed"
        ASSIGNED         = "ASSIGNED",         "Assigned to Client"

    # ── Who ──────────────────────────────────────────────────────────────────
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_plan_requests",
        limit_choices_to={"role": "CLIENT"},
    )
    trainer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_plan_reviews",
        limit_choices_to={"role": "TRAINER"},
        help_text="Auto-populated from the client's active TrainerAssignment",
    )

    # ── Plan week ────────────────────────────────────────────────────────────
    week_number = models.PositiveIntegerField(
        default=1,
        help_text="Week 1 = initial plan, 2+ = adaptive regenerations",
    )

    # ── Input data ───────────────────────────────────────────────────────────
    questionnaire = models.JSONField(
        help_text="Extra questions answered by the client (equipment, schedule, etc.)",
    )
    previous_progress = models.JSONField(
        null=True,
        blank=True,
        help_text="Workout/diet completion % from the previous week (for adaptive plans)",
    )

    # ── AI audit trail ───────────────────────────────────────────────────────
    ai_prompt       = models.TextField(blank=True, help_text="The full prompt sent to Gemini")
    ai_response_raw = models.TextField(blank=True, help_text="Raw JSON response from Gemini")
    error_message   = models.TextField(blank=True, help_text="Error details if generation failed")

    # ── Generated plans (set after Gemini responds) ──────────────────────────
    workout_plan = models.ForeignKey(
        "workout_plans.WorkoutPlan",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_requests",
    )
    diet_plan = models.ForeignKey(
        "diet_plans.DietPlan",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_requests",
    )

    # ── Status & timestamps ──────────────────────────────────────────────────
    status     = models.CharField(max_length=30, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "AI Plan Request"
        verbose_name_plural = "AI Plan Requests"

    def __str__(self):
        return f"Week {self.week_number} AI Plan for {self.client.email} [{self.status}]"
