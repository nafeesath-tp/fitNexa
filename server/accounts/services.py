from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

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


def login_user(validated_data):
    """
    Authenticate user, check account state, and generate JWT tokens.
    Returns an extensible dict: { user, access, refresh }.
    Raises ValidationError on any failure.
    """
    email = validated_data["email"]
    password = validated_data["password"]

    # Use a generic message to prevent user enumeration
    invalid_credentials_error = serializers.ValidationError(
        {"email": "Invalid email or password."}
    )

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        raise invalid_credentials_error

    if not user.check_password(password):
        raise invalid_credentials_error

    if not user.is_verified:
        raise serializers.ValidationError(
            {"email": "Please verify your email before logging in."}
        )

    if not user.is_active:
        raise serializers.ValidationError(
            {"email": "Your account has been deactivated. Please contact support."}
        )

    refresh = RefreshToken.for_user(user)
    access = refresh.access_token

    response_data = {
        "email": user.email,
        "role": user.role,
    }

    if user.role == "TRAINER":
        try:
            response_data["approval_status"] = user.trainer_profile.approval_status
        except Exception:
            response_data["approval_status"] = "PENDING_ONBOARDING"
            
    elif user.role == "CLIENT":
        try:
            response_data["is_profile_completed"] = user.client_profile.is_profile_completed
        except Exception:
            response_data["is_profile_completed"] = False

    return {
        "user": user,
        "access": str(access),
        "refresh": str(refresh),
        "response_data": response_data,
    }


def forgot_password(validated_data):
    """
    Check user exists, generate a PASSWORD_RESET OTP, and send it by email.
    Always returns None — never reveals whether the email is registered
    (prevents user enumeration).
    """
    email = validated_data["email"]

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # Silent return — don't reveal that the account doesn't exist
        return

    otp = generate_otp()

    EmailOTP.objects.create(
        user=user,
        otp=otp,
        purpose=EmailOTP.Purpose.PASSWORD_RESET,
        expires_at=timezone.now() + timedelta(minutes=5),
    )

    send_otp_email(email=user.email, otp=otp)


def verify_reset_otp(validated_data):
    """
    Validate the PASSWORD_RESET OTP without consuming it.
    The OTP is consumed only when reset_password() is called.
    Raises ValidationError on failure.
    """
    email = validated_data["email"]
    otp = validated_data["otp"]

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        raise serializers.ValidationError({"email": "No account found with this email."})

    otp_record = (
        EmailOTP.objects.filter(
            user=user,
            otp=otp,
            purpose=EmailOTP.Purpose.PASSWORD_RESET,
            is_used=False,
            expires_at__gt=timezone.now(),
        )
        .order_by("-created_at")
        .first()
    )

    if not otp_record:
        raise serializers.ValidationError({"otp": "Invalid or expired OTP."})

    return user


@transaction.atomic
def reset_password(validated_data):
    """
    Verify the PASSWORD_RESET OTP, consume it, and set the new password.
    Raises ValidationError if OTP is invalid or expired.
    """
    email = validated_data["email"]
    otp_value = validated_data.get("otp")
    new_password = validated_data["password"]

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        raise serializers.ValidationError({"email": "No account found with this email."})

    otp_record = (
        EmailOTP.objects.filter(
            user=user,
            otp=otp_value,
            purpose=EmailOTP.Purpose.PASSWORD_RESET,
            is_used=False,
            expires_at__gt=timezone.now(),
        )
        .order_by("-created_at")
        .first()
    )

    if not otp_record:
        raise serializers.ValidationError({"otp": "Invalid or expired OTP."})

    # Consume OTP and set new password atomically
    otp_record.is_used = True
    otp_record.save(update_fields=["is_used"])

    user.set_password(new_password)
    user.save(update_fields=["password"])

    return user
