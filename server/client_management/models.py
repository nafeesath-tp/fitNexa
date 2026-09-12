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
    updated_at  = models.DateTimeField(auto_now=True)
    is_active   = models.BooleanField(default=True)
    notes       = models.TextField(blank=True, help_text="Admin notes regarding this assignment")

    class Meta:
        ordering = ["-assigned_at"]

    def __str__(self):
        return f"{self.client.email} -> Assigned to {self.trainer.email}"


class TrainerGroup(models.Model):
    """
    A named batch/cohort created by a trainer for GROUP-plan clients.
    One trainer can have multiple groups (e.g. Morning Batch, Evening Batch).
    The trainer manually picks which of their assigned GROUP clients go into each group.
    """
    trainer     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="trainer_groups",
        limit_choices_to={"role": User.Role.TRAINER},
    )
    name        = models.CharField(max_length=150, help_text="e.g. 'Morning Batch A'")
    description = models.TextField(blank=True, default="")
    max_members = models.PositiveIntegerField(
        default=10,
        help_text="Maximum number of clients allowed in this group.",
    )
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Trainer Group"
        verbose_name_plural = "Trainer Groups"

    def __str__(self):
        return f"{self.trainer.email} → {self.name}"

    @property
    def member_count(self):
        return self.members.filter().count()

    @property
    def is_full(self):
        return self.member_count >= self.max_members


class TrainerGroupMember(models.Model):
    """
    Links a GROUP-plan client (via their TrainerAssignment) to a TrainerGroup.
    OneToOne on trainer_assignment ensures a client can only be in ONE group at a time.
    """
    group              = models.ForeignKey(
        TrainerGroup,
        on_delete=models.CASCADE,
        related_name="members",
    )
    trainer_assignment = models.OneToOneField(
        TrainerAssignment,
        on_delete=models.CASCADE,
        related_name="group_membership",
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["joined_at"]
        verbose_name = "Group Member"
        verbose_name_plural = "Group Members"

    def __str__(self):
        return f"{self.trainer_assignment.client.email} in {self.group.name}"
