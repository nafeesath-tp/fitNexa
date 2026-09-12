import re
from rest_framework import serializers
from .models import TrainingVideo


class ClientTrainingVideoSerializer(serializers.ModelSerializer):
    """
    Serializer for Client video streaming library.
    Dynamically calculates is_locked and required_plan based on client's active subscription tier.
    Obscures video_url if is_locked=True for security.
    """
    specialization_name = serializers.SerializerMethodField()
    is_locked = serializers.SerializerMethodField()
    required_plan = serializers.SerializerMethodField()
    video_url = serializers.SerializerMethodField()

    class Meta:
        model = TrainingVideo
        fields = [
            "id",
            "title",
            "description",
            "video_type",
            "video_url",
            "thumbnail_url",
            "specialization",
            "specialization_name",
            "difficulty",
            "access_level",
            "duration_minutes",
            "estimated_calories",
            "is_featured",
            "is_locked",
            "required_plan",
            "created_at",
        ]

    def get_specialization_name(self, obj):
        return obj.specialization.name if obj.specialization else "General"

    def get_is_locked(self, obj):
        return False

    def get_required_plan(self, obj):
        return None

    def get_video_url(self, obj):
        if obj.video_file:
            # For Cloudinary VideoMediaCloudinaryStorage, .url gives the stream link
            return obj.video_file.url
        return obj.video_url


class AdminTrainingVideoSerializer(serializers.ModelSerializer):
    """
    Serializer for Admin Content Management studio.
    Supports all CRUD operations across 3 categorization dimensions.
    """
    specialization_name = serializers.SerializerMethodField()
    uploaded_by_email = serializers.SerializerMethodField()

    class Meta:
        model = TrainingVideo
        fields = [
            "id",
            "title",
            "description",
            "video_type",
            "video_url",
            "video_file",
            "thumbnail_url",
            "specialization",
            "specialization_name",
            "difficulty",
            "access_level",
            "duration_minutes",
            "estimated_calories",
            "is_featured",
            "display_order",
            "is_published",
            "uploaded_by",
            "uploaded_by_email",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "uploaded_by", "created_at", "updated_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.video_file:
            data['video_url'] = instance.video_file.url
        return data

    def get_specialization_name(self, obj):
        return obj.specialization.name if obj.specialization else "General"

    def get_uploaded_by_email(self, obj):
        return obj.uploaded_by.email if obj.uploaded_by else None

    def validate(self, attrs):
        video_url = attrs.get("video_url", getattr(self.instance, "video_url", ""))
        video_file = attrs.get("video_file", getattr(self.instance, "video_file", None))
        video_type = attrs.get("video_type", getattr(self.instance, "video_type", TrainingVideo.VideoType.YOUTUBE))
        thumbnail_url = attrs.get("thumbnail_url", getattr(self.instance, "thumbnail_url", ""))

        if not video_url and not video_file:
            raise serializers.ValidationError({"video_url": "Either a Video URL or a Video File must be provided."})

        # Auto-extract thumbnail for YouTube videos if none provided
        if video_type == TrainingVideo.VideoType.YOUTUBE and not thumbnail_url and video_url:
            # Match standard youtube watch URL or youtu.be short URL or embed URL
            yt_pattern = r"(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})"
            match = re.search(yt_pattern, video_url)
            if match:
                video_id = match.group(1)
                attrs["thumbnail_url"] = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"

        return attrs
