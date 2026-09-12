from django.db import models
from scheduling.models import PersonalTrainingSession
from group_workouts.models import GroupWorkoutSession
from django.core.exceptions import ValidationError

class VideoSession(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Scheduled"
        WAITING = "WAITING", "Waiting"
        LIVE = "LIVE", "Live"
        ENDED = "ENDED", "Ended"
        CANCELLED = "CANCELLED", "Cancelled"
        NO_SHOW = "NO_SHOW", "No-show"

    personal_session = models.OneToOneField(
        PersonalTrainingSession,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="video_session",
    )

    group_session = models.OneToOneField(
        GroupWorkoutSession,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="video_session",
    )

    room_name = models.CharField(max_length=255, unique=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED,
    )

    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)

    trainer_joined_at = models.DateTimeField(null=True, blank=True)
    trainer_left_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        super().clean()
        if bool(self.personal_session) == bool(self.group_session):
            raise ValidationError("Exactly one of personal_session or group_session must be set.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    @property
    def session_type(self):
        if self.personal_session_id:
            return "PERSONAL"
        if self.group_session_id:
            return "GROUP"
        return "UNKNOWN"

    def __str__(self):
        return f"{self.session_type} Session | Room: {self.room_name} | {self.status}"
