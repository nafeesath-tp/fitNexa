from django.db import models
from django.conf import settings
from accounts.models import User


class TrainerAssignment(models.Model):
    """
    Module 7: Client Management & Trainer Assignments
    Links a CLIENT user to an approved TRAINER user, assigned by an ADMIN.
    """
    client = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="trainer_assignment",
        limit_choices_to={"role": User.Role.CLIENT},
    )
    trainer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="assigned_clients",
        limit_choices_to={"role": User.Role.TRAINER},
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="trainer_assignments_created",
        limit_choices_to={"role": User.Role.ADMIN},
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, help_text="Admin notes regarding this assignment")

    class Meta:
        ordering = ["-assigned_at"]

    def __str__(self):
        return f"{self.client.email} -> Assigned to {self.trainer.email}"
