"""
chat/models.py — Conversation, Message, ChatReport
"""
from django.db import models
from django.conf import settings


class Conversation(models.Model):
    """One conversation between one assigned trainer and one client."""
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='client_conversations',
    )
    trainer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='trainer_conversations',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('client', 'trainer')
        ordering = ['-updated_at']

    def __str__(self):
        return f"Conversation: {self.client.email} ↔ {self.trainer.email}"

    def get_other_user(self, user):
        return self.trainer if self.client == user else self.client

    def unread_count_for(self, user):
        """Count messages NOT sent by this user that are unread."""
        return self.messages.filter(is_read=False).exclude(sender=user).count()

    def last_message(self):
        return self.messages.order_by('-created_at').first()


ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png', 'gif', 'docx', 'doc', 'txt', 'mp4', 'mov'}
MAX_FILE_SIZE_MB = 10


class Message(models.Model):
    """A single message in a conversation."""
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages',
    )
    content = models.TextField(blank=True, default='')
    file = models.FileField(
        upload_to='chat/attachments/',
        null=True, blank=True,
    )
    file_name = models.CharField(max_length=255, blank=True, default='')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Msg #{self.id} from {self.sender.email}"

    def clean(self):
        from django.core.exceptions import ValidationError
        if not self.content and not self.file:
            raise ValidationError("A message must have content or a file.")
        if self.file:
            ext = self.file_name.rsplit('.', 1)[-1].lower() if '.' in self.file_name else ''
            if ext not in ALLOWED_EXTENSIONS:
                raise ValidationError(f"File type '.{ext}' is not allowed.")


class ChatReport(models.Model):
    """Report submitted by a user about an inappropriate message."""

    class Status(models.TextChoices):
        PENDING   = 'PENDING',   'Pending'
        REVIEWED  = 'REVIEWED',  'Reviewed'
        DISMISSED = 'DISMISSED', 'Dismissed'

    message     = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='reports')
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='filed_reports',
    )
    reason      = models.TextField()
    status      = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reviewed_reports',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Report #{self.id} on Msg #{self.message_id} [{self.status}]"
