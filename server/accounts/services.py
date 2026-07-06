from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import User, EmailOTP
from .utils import generate_otp, send_otp_email


@transaction.atomic
def signup_user(validated_data):
    """
    Create a new user, generate OTP, and send verification email.
    Returns the created user.
    """
    data = validated_data.copy()
    data.pop("confirm_password", None)
    password = data.pop("password")

    user = User.objects.create_user(
        password=password,
        **data,
    )

    otp = generate_otp()

    EmailOTP.objects.create(
        user=user,
        otp=otp,
        purpose=EmailOTP.Purpose.SIGNUP,
        expires_at=timezone.now() + timedelta(minutes=5),
    )

    send_otp_email(email=user.email, otp=otp)

    return user


def verify_otp(validated_data):
    """
    Verify the OTP for a given email.
    Activates the user on success.
    Raises ValidationError on failure.
    """
    email = validated_data["email"]
    otp = validated_data["otp"]

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        raise serializers.ValidationError({"email": "No account found with this email."})

    if user.is_verified:
        raise serializers.ValidationError({"email": "Email is already verified."})

    otp_record = (
        EmailOTP.objects.filter(
            user=user,
            otp=otp,
            purpose=EmailOTP.Purpose.SIGNUP,
            is_used=False,
            expires_at__gt=timezone.now(),
        )
        .order_by("-created_at")
        .first()
    )

    if not otp_record:
        raise serializers.ValidationError({"otp": "Invalid or expired OTP."})

    # Mark OTP as used and activate user
    otp_record.is_used = True
    otp_record.save(update_fields=["is_used"])

    user.is_verified = True
    user.save(update_fields=["is_verified"])

    return user
