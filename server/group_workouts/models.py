from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

User = settings.AUTH_USER_MODEL


class GroupWorkout(models.Model):
    """
    Represents the recurring GROUP workout concept.
    Distinct from WorkoutPlan (which is a prescriptive program).
    This is WHAT a group workout is.
    """
    class Level(models.TextChoices):
        BEGINNER = 'BEGINNER', 'Beginner'
        INTERMEDIATE = 'INTERMEDIATE', 'Intermediate'
        ADVANCED = 'ADVANCED', 'Advanced'

    trainer = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='group_workouts',
        limit_choices_to={'role': 'TRAINER'}
    )
    title = models.CharField(max_length=255)
    specialization = models.ForeignKey(
        'accounts.Specialization',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='group_workouts'
    )
    level = models.CharField(max_length=20, choices=Level.choices, default=Level.BEGINNER)
    capacity = models.PositiveIntegerField(default=10)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} — {self.trainer.email}"

    class Meta:
        ordering = ['-created_at']


class GroupWorkoutSession(models.Model):
    """
    A specific scheduled instance of a GroupWorkout.
    This is WHEN the group workout happens.
    """
    class Status(models.TextChoices):
        SCHEDULED = 'SCHEDULED', 'Scheduled'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    group_workout = models.ForeignKey(GroupWorkout, on_delete=models.CASCADE, related_name='sessions')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if self.start_time >= self.end_time:
            raise ValidationError("Start time must be before end time.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    @property
    def participant_count(self):
        return self.participants.filter(status='JOINED').count()

    @property
    def is_full(self):
        return self.participant_count >= self.group_workout.capacity

    @property
    def spots_available(self):
        return max(0, self.group_workout.capacity - self.participant_count)

    def __str__(self):
        return f"{self.group_workout.title} — {self.date} {self.start_time}"

    class Meta:
        ordering = ['date', 'start_time']


class GroupWorkoutParticipant(models.Model):
    """
    Tracks a client's booking for a specific GroupWorkoutSession.
    """
    class Status(models.TextChoices):
        JOINED = 'JOINED', 'Joined'
        CANCELLED = 'CANCELLED', 'Cancelled'

    session = models.ForeignKey(GroupWorkoutSession, on_delete=models.CASCADE, related_name='participants')
    client = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='group_participations',
        limit_choices_to={'role': 'CLIENT'}
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.JOINED)
    booked_at = models.DateTimeField(auto_now_add=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        # A client can only have ONE participant record per session
        unique_together = ('session', 'client')

    def __str__(self):
        return f"{self.client.email} → {self.session}"
