from decimal import Decimal, InvalidOperation

from rest_framework import serializers

from accounts.models import User
from .models import ClientProfile


# ── BMI Helper ────────────────────────────────────────────────────────────────

def calculate_bmi(weight_kg, height_cm):
    """
    Calculate Body Mass Index (BMI) from weight and height.

    Formula: BMI = weight (kg) / (height (m))²

    Returns a rounded float to 1 decimal place, or None if either value
    is missing or invalid (e.g. height of zero).

    Kept as a standalone helper so both create and update can reuse it,
    and future features (AI plans, health analytics) can import it directly.
    """
    if weight_kg is None or height_cm is None:
        return None

    try:
        weight = Decimal(str(weight_kg))
        height_m = Decimal(str(height_cm)) / Decimal("100")

        if height_m <= 0:
            return None

        bmi = weight / (height_m ** 2)
        return round(float(bmi), 1)

    except (InvalidOperation, ZeroDivisionError):
        return None


def _bmi_category(bmi):
    """
    Return a human-readable BMI category string.
    Used to enrich the profile response without extra DB queries.
    """
    if bmi is None:
        return None
    if bmi < 18.5:
        return "Underweight"
    if bmi < 25.0:
        return "Normal weight"
    if bmi < 30.0:
        return "Overweight"
    return "Obese"


# ── Service Functions ─────────────────────────────────────────────────────────

def create_client_profile(user, validated_data):
    """
    Create (or complete) a ClientProfile for the given user.

    Business rules:
    - User must have role == CLIENT.
    - If no profile exists → create a new one.
    - If a profile exists with is_profile_completed=False (e.g. created by
      Google signup with minimal data) → update it and mark as completed.
      This is the "Google CLIENT" path: Google signup pre-creates a profile
      with first_name/last_name, but the user still needs to fill in their
      health and fitness data.
    - If a profile already exists AND is_profile_completed=True → reject
      (use the PATCH /api/client/profile/ endpoint to edit an existing one).

    Returns a dict containing the saved profile and the calculated BMI.
    """
    # Rule 1: only CLIENT-role users can create a client profile
    if user.role != User.Role.CLIENT:
        raise serializers.ValidationError(
            {"detail": "Only clients can create a client profile."}
        )

    existing = ClientProfile.objects.filter(user=user).first()

    if existing is not None and existing.is_profile_completed:
        # Already fully set up — direct the user to the edit endpoint
        raise serializers.ValidationError(
            {"detail": "You have already created your profile. Use the edit page to make changes."}
        )

    if existing is not None:
        # Profile exists but is incomplete (e.g. created by Google signup).
        # Apply all supplied fields on top of existing data.
        for field, value in validated_data.items():
            setattr(existing, field, value)
        
        # If is_profile_completed wasn't provided in the request, keep it as is (or True if we want to fallback, but let's just use what's provided or default to False via serializer)
        # Actually the serializer adds default=False for create, but for updates on an existing incomplete profile we should respect validated_data.
        if 'is_profile_completed' not in validated_data:
            pass # Keep whatever is already in the DB
            
        existing.save()
        profile = existing
    else:
        # Brand-new profile (email-signup flow)
        profile = ClientProfile.objects.create(
            user=user,
            **validated_data,
        )

    bmi = calculate_bmi(profile.weight_kg, profile.height_cm)

    return {
        "profile": profile,
        "bmi": bmi,
        "bmi_category": _bmi_category(bmi),
    }


def get_client_profile(user):
    """
    Retrieve the ClientProfile for the given user.

    BMI is calculated dynamically here — never stored in the DB.

    Raises ValidationError if no profile exists yet.
    Returns a dict containing the profile and the calculated BMI.
    """
    try:
        profile = ClientProfile.objects.get(user=user)
    except ClientProfile.DoesNotExist:
        raise serializers.ValidationError(
            {"detail": "Profile not found. Please complete your profile setup."}
        )

    bmi = calculate_bmi(profile.weight_kg, profile.height_cm)

    return {
        "profile": profile,
        "bmi": bmi,
        "bmi_category": _bmi_category(bmi),
    }


def update_client_profile(user, validated_data):
    """
    Apply a partial update to the client's profile (PATCH semantics).

    Only fields present in validated_data are updated — untouched fields
    keep their existing values. This lets the frontend send only what changed.

    BMI is recalculated after every update using the latest weight/height
    values (whether newly submitted or already stored).

    Raises ValidationError if no profile exists yet.
    Returns a dict containing the updated profile and the recalculated BMI.
    """
    try:
        profile = ClientProfile.objects.get(user=user)
    except ClientProfile.DoesNotExist:
        raise serializers.ValidationError(
            {"detail": "Profile not found. Please create your profile first."}
        )

    # Apply only the fields that were supplied in this request
    updated_fields = []
    
    # Handle specific image removal flag
    remove_image = validated_data.pop("remove_profile_image", False)
    if remove_image:
        profile.profile_image = None
        updated_fields.append("profile_image")

    for field, value in validated_data.items():
        setattr(profile, field, value)
        updated_fields.append(field)

    if updated_fields:
        profile.save(update_fields=updated_fields + ["updated_at"])

    # Recalculate BMI with the latest stored values (post-save)
    bmi = calculate_bmi(profile.weight_kg, profile.height_cm)

    return {
        "profile": profile,
        "bmi": bmi,
        "bmi_category": _bmi_category(bmi),
    }
