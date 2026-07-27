

from rest_framework import serializers

from accounts.models import Specialization, TrainerProfile


class TrainerOnboardingSerializer(serializers.Serializer):
    """
    Validates trainer onboarding input only.
    No database operations here — that belongs in the service layer.
    """

    first_name = serializers.CharField(max_length=100)

    last_name = serializers.CharField(max_length=100)

    phone = serializers.CharField(max_length=15)

    bio = serializers.CharField()

    experience = serializers.IntegerField(min_value=0)

    specialization = serializers.PrimaryKeyRelatedField(
        queryset=Specialization.objects.filter(is_active=True)
    )

    profile_image = serializers.ImageField(required=False)

    certificate = serializers.FileField(required=False)


class SpecializationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Specialization
        fields = ["id", "name", "description"]


class TrainerProfileSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for displaying trainer profile data.
    """

    specialization = SpecializationSerializer(read_only=True)

    email = serializers.EmailField(source="user.email", read_only=True)

    certificate = serializers.SerializerMethodField()
    certificate_download = serializers.SerializerMethodField()
    profile_image = serializers.SerializerMethodField()

    class Meta:
        model = TrainerProfile
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "bio",
            "experience",
            "specialization",
            "profile_image",
            "certificate",
            "certificate_download",
            "approval_status",
            "rejection_reason",
            "created_at",
        ]
        read_only_fields = fields

    def get_certificate(self, obj):
        """Return URL for viewing certificate (converted to image for Cloudinary free tier)."""
        if obj.certificate:
            try:
                url = obj.certificate.url
                
                # For Cloudinary, ensure it is served as an image to bypass PDF security restrictions (401 Unauthorized)
                if 'cloudinary.com' in url:
                    if url.endswith('.pdf'):
                        url = url.replace('.pdf', '.png')
                        url = url.replace('/upload/', '/upload/pg_1,w_800,q_auto,f_auto/')
                    elif not any(url.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
                        # If it has no standard image extension (like when Cloudinary drops .pdf), append .png
                        url = url + '.png'
                        url = url.replace('/upload/', '/upload/pg_1,w_800,q_auto,f_auto/')
                
                return url
            except Exception as e:
                return None
        return None
    
    def get_certificate_download(self, obj):
        """Return URL for downloading the certificate as a high-quality image or pdf."""
        if obj.certificate:
            try:
                url = obj.certificate.url
                if 'cloudinary.com' in url:
                    # If it has no extension, append .pdf so the downloaded file has the correct extension
                    if not any(url.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf']):
                        url = url + '.pdf'
                    # Always force attachment download
                    if '/upload/' in url and 'fl_attachment' not in url:
                        url = url.replace('/upload/', '/upload/fl_attachment/')
                return url
            except Exception as e:
                return None
        return None
    
    def get_profile_image(self, obj):
        """Return the full URL for the profile image."""
        if obj.profile_image:
            url = obj.profile_image.url
            # Cloudinary URLs are already absolute, don't modify them
            if url.startswith('http://') or url.startswith('https://'):
                return url
            # For local files, build absolute URI
            request = self.context.get('request')
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        return None
