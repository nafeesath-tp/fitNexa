from django.db import models
from django.conf import settings


class ClientProfile(models.Model):
    """
    Extended profile for users with the CLIENT role.
    Linked one-to-one to the custom User model.
    """

    # ── Choice Enumerations ──────────────────────────────────────────────────

    class Gender(models.TextChoices):
        MALE = "MALE", "Male"
        FEMALE = "FEMALE", "Female"
        OTHER = "OTHER", "Other"
        PREFER_NOT_TO_SAY = "PREFER_NOT_TO_SAY", "Prefer not to say"

    class FitnessGoal(models.TextChoices):
        LOSE_WEIGHT = "LOSE_WEIGHT", "Lose Weight"
        BUILD_MUSCLE = "BUILD_MUSCLE", "Build Muscle"
        IMPROVE_ENDURANCE = "IMPROVE_ENDURANCE", "Improve Endurance"
        INCREASE_FLEXIBILITY = "INCREASE_FLEXIBILITY", "Increase Flexibility"
        MAINTAIN_FITNESS = "MAINTAIN_FITNESS", "Maintain Fitness"
        GENERAL_HEALTH = "GENERAL_HEALTH", "General Health"

    class PreferredWorkout(models.TextChoices):
        STRENGTH_TRAINING = "STRENGTH_TRAINING", "Strength Training"
        CARDIO = "CARDIO", "Cardio"
        YOGA = "YOGA", "Yoga"
        HIIT = "HIIT", "HIIT"
        PILATES = "PILATES", "Pilates"
        CROSSFIT = "CROSSFIT", "CrossFit"
        SWIMMING = "SWIMMING", "Swimming"
        CYCLING = "CYCLING", "Cycling"

    class ExperienceLevel(models.TextChoices):
        BEGINNER = "BEGINNER", "Beginner"
        INTERMEDIATE = "INTERMEDIATE", "Intermediate"
        ADVANCED = "ADVANCED", "Advanced"

    class DietPreference(models.TextChoices):
        NONE = "NONE", "No Preference"
        VEGETARIAN = "VEGETARIAN", "Vegetarian"
        VEGAN = "VEGAN", "Vegan"
        KETO = "KETO", "Keto"
        PALEO = "PALEO", "Paleo"
        GLUTEN_FREE = "GLUTEN_FREE", "Gluten-Free"
        DAIRY_FREE = "DAIRY_FREE", "Dairy-Free"

    # ── Relationship ─────────────────────────────────────────────────────────

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="client_profile",
    )

    # ── Personal Information ──────────────────────────────────────────────────

    first_name = models.CharField(max_length=100)

    last_name = models.CharField(max_length=100)

    phone = models.CharField(max_length=15, blank=True)

    profile_image = models.ImageField(
        upload_to="client/profiles/",
        blank=True,
        null=True,
    )

    # ── Basic Information ─────────────────────────────────────────────────────

    date_of_birth = models.DateField(blank=True, null=True)

    gender = models.CharField(
        max_length=20,
        choices=Gender.choices,
        blank=True,
    )

    # ── Fitness Information ───────────────────────────────────────────────────

    fitness_goal = models.CharField(
        max_length=30,
        choices=FitnessGoal.choices,
        blank=True,
    )

    preferred_workout = models.CharField(
        max_length=30,
        choices=PreferredWorkout.choices,
        blank=True,
    )

    experience_level = models.CharField(
        max_length=20,
        choices=ExperienceLevel.choices,
        blank=True,
    )

    # ── Health Information ────────────────────────────────────────────────────

    height_cm = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Height in centimetres",
    )

    weight_kg = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Current weight in kilograms",
    )

    target_weight_kg = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Target weight in kilograms",
    )

    diet_preference = models.CharField(
        max_length=20,
        choices=DietPreference.choices,
        default=DietPreference.NONE,
        blank=True,
    )

    medical_condition = models.TextField(
        blank=True,
        help_text="Any medical conditions or injuries the trainer should know about",
    )

    # ── Metadata ──────────────────────────────────────────────────────────────

    is_profile_completed = models.BooleanField(
        default=False,
        help_text="Set to True once the client completes the full onboarding profile.",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    # ── Dunder ───────────────────────────────────────────────────────────────

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.user.email})"

    class Meta:
        verbose_name = "Client Profile"
        verbose_name_plural = "Client Profiles"
        ordering = ["last_name", "first_name"]
