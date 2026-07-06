from django.db import models

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin

from .managers import UserManager
from django.conf import settings
from django.utils import timezone


class User(AbstractBaseUser, PermissionsMixin):

    class Role(models.TextChoices):
        CLIENT = "CLIENT", "Client"
        TRAINER = "TRAINER", "Trainer"
        ADMIN = "ADMIN", "Admin"

    email = models.EmailField(unique=True)

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CLIENT
    )

    is_verified = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)

    is_staff = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"

    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email
class EmailOTP(models.Model):

    class Purpose(models.TextChoices):
        SIGNUP = "SIGNUP", "Signup"
        PASSWORD_RESET = "PASSWORD_RESET", "Password Reset"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_otps",
    )

    otp = models.CharField(max_length=6)

    purpose = models.CharField(
        max_length=20,
        choices=Purpose.choices,
    )

    is_used = models.BooleanField(default=False)

    expires_at = models.DateTimeField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} - {self.purpose}"
