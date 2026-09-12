from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

User = settings.AUTH_USER_MODEL

class TrainerSchedulingSettings(models.Model):
    class SessionDuration(models.IntegerChoices):
        MIN_30 = 30, '30 minutes'
        MIN_45 = 45, '45 minutes'
        MIN_60 = 60, '60 minutes'
        MIN_90 = 90, '90 minutes'

    trainer = models.OneToOneField(User, on_delete=models.CASCADE, related_name='scheduling_settings')
    session_duration = models.IntegerField(choices=SessionDuration.choices, default=SessionDuration.MIN_60)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.trainer.email} - Settings"


class TrainerAvailability(models.Model):
    class DayOfWeek(models.IntegerChoices):
        MONDAY = 0, _('Monday')
        TUESDAY = 1, _('Tuesday')
        WEDNESDAY = 2, _('Wednesday')
        THURSDAY = 3, _('Thursday')
        FRIDAY = 4, _('Friday')
        SATURDAY = 5, _('Saturday')
        SUNDAY = 6, _('Sunday')

    trainer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='availabilities')
    day_of_week = models.IntegerField(choices=DayOfWeek.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.trainer.email} - {self.get_day_of_week_display()} ({self.start_time} - {self.end_time})"

    def clean(self):
        super().clean()
        if self.start_time >= self.end_time:
            raise ValidationError("Start time must be before end time.")

        # Check for overlapping availability
        overlapping = TrainerAvailability.objects.filter(
            trainer=self.trainer,
            day_of_week=self.day_of_week,
            start_time__lt=self.end_time,
            end_time__gt=self.start_time
        )
        if self.pk:
            overlapping = overlapping.exclude(pk=self.pk)
            
        if overlapping.exists():
            raise ValidationError("This availability overlaps with an existing availability range.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


class BlockedDate(models.Model):
    trainer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocked_dates')
    date = models.DateField()
    reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('trainer', 'date')

    def __str__(self):
        return f"{self.trainer.email} - Blocked {self.date}"


class TrainerSlot(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Available"
        BOOKED = "BOOKED", "Booked"
        BLOCKED = "BLOCKED", "Blocked"

    trainer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='slots')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['trainer', 'date', 'start_time'], name='unique_trainer_slot')
        ]
        ordering = ['date', 'start_time']

    def __str__(self):
        return f"{self.trainer.email} | {self.date} {self.start_time}-{self.end_time} [{self.status}]"


class PersonalTrainingSession(models.Model):
    class Status(models.TextChoices):
        BOOKED = "BOOKED", "Booked"
        CANCELLED = "CANCELLED", "Cancelled"
        RESCHEDULED = "RESCHEDULED", "Rescheduled"
        COMPLETED = "COMPLETED", "Completed"

    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='client_sessions')
    trainer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trainer_sessions')
    slot = models.OneToOneField(TrainerSlot, on_delete=models.PROTECT, related_name='session')
    
    # Mirrored for easy querying and historical records
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.BOOKED)
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['date', 'start_time']

    def __str__(self):
        return f"{self.client.email} with {self.trainer.email} on {self.date} [{self.status}]"
