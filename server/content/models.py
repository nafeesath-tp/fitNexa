from django.db import models
from django.conf import settings


class TrainingVideo(models.Model):
    """
    Module 6: Fitness Content Management
    Categorized by 3 dimensions:
    1. Specialization (Yoga, Boxing, HIIT, etc.)
    2. Difficulty Level (Beginner, Intermediate, Advanced)
    3. Subscription Access Tier (Free, Group, Premium)
    """
    class VideoType(models.TextChoices):
        YOUTUBE = "YOUTUBE", "YouTube"
        CLOUDINARY = "CLOUDINARY", "Cloudinary / Direct MP4"

    class DifficultyLevel(models.TextChoices):
        BEGINNER = "BEGINNER", "Beginner"
        INTERMEDIATE = "INTERMEDIATE", "Intermediate"
        ADVANCED = "ADVANCED", "Advanced"

    class AccessLevel(models.TextChoices):
        FREE = "FREE", "Free"
        GROUP = "GROUP", "Group"
        PREMIUM = "PREMIUM", "Premium"

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    video_type = models.CharField(max_length=20, choices=VideoType.choices, default=VideoType.YOUTUBE)
    video_url = models.URLField(max_length=500, help_text="YouTube embed URL or Cloudinary video stream URL")
    thumbnail_url = models.URLField(max_length=500, blank=True, null=True)
    
    # ── 3-Dimensional Categorization ─────────────────────────────────────────
    specialization = models.ForeignKey(
        "accounts.Specialization", 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name="videos"
    )
    difficulty = models.CharField(
        max_length=20, 
        choices=DifficultyLevel.choices, 
        default=DifficultyLevel.BEGINNER
    )
    access_level = models.CharField(
        max_length=20, 
        choices=AccessLevel.choices, 
        default=AccessLevel.FREE
    )
    
    # ── Additional Metadata & Features ───────────────────────────────────────
    duration_minutes = models.PositiveIntegerField(help_text="Duration in minutes", default=10)
    estimated_calories = models.PositiveIntegerField(null=True, blank=True, help_text="Estimated calories burned")
    is_featured = models.BooleanField(default=False, help_text="Featured workout on client dashboard")
    display_order = models.PositiveIntegerField(default=0, help_text="Order for display sorting")
    is_published = models.BooleanField(default=True, help_text="Only published videos are visible to clients")
    
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name="uploaded_videos"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_featured", "display_order", "-created_at"]

    def __str__(self):
        return f"{self.title} ({self.get_access_level_display()} - {self.get_difficulty_display()})"
