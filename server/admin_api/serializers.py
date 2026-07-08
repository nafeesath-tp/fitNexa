


from rest_framework import serializers
from accounts.models import TrainerProfile, Specialization
from client.models import ClientProfile

class AdminSpecializationSerializer(serializers.ModelSerializer):
    trainer_count = serializers.SerializerMethodField()

    class Meta:
        model = Specialization
        fields = ['id', 'name', 'description', 'is_active', 'created_at', 'trainer_count']
        read_only_fields = ['id', 'created_at', 'trainer_count']

    def get_trainer_count(self, obj):
        """Return the number of trainers using this specialization."""
        return obj.trainers.count()

class AdminTrainerProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    specialization_name = serializers.CharField(source='specialization.name', read_only=True)
    certificate = serializers.SerializerMethodField()
    certificate_download = serializers.SerializerMethodField()
    profile_image = serializers.SerializerMethodField()
    
    class Meta:
        model = TrainerProfile
        fields = [
            'id',
            'user',
            'email',
            'first_name',
            'last_name',
            'phone',
            'bio',
            'experience',
            'specialization',
            'specialization_name',
            'profile_image',
            'certificate',
            'certificate_download',
            'approval_status',
            'created_at',
            'updated_at',
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

class AdminTrainerStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainerProfile
        fields = ['approval_status']
        
    def validate_approval_status(self, value):
        if value not in [TrainerProfile.ApprovalStatus.APPROVED, TrainerProfile.ApprovalStatus.REJECTED]:
            raise serializers.ValidationError("Status must be either APPROVED or REJECTED.")
        return value

class AdminClientListSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    is_active = serializers.BooleanField(source='user.is_active', read_only=True)
    name = serializers.SerializerMethodField()

    class Meta:
        model = ClientProfile
        fields = [
            'id',
            'email',
            'name',
            'phone',
            'fitness_goal',
            'experience_level',
            'is_profile_completed',
            'is_active',
        ]
        read_only_fields = fields

    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()

class AdminClientDetailSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    is_active = serializers.BooleanField(source='user.is_active', read_only=True)

    class Meta:
        model = ClientProfile
        fields = [
            'id',
            'user',
            'email',
            'first_name',
            'last_name',
            'phone',
            'date_of_birth',
            'gender',
            'fitness_goal',
            'preferred_workout',
            'experience_level',
            'height_cm',
            'weight_kg',
            'target_weight_kg',
            'diet_preference',
            'medical_condition',
            'is_profile_completed',
            'is_active',
            'profile_image',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

class AdminClientStatusUpdateSerializer(serializers.Serializer):
    is_active = serializers.BooleanField()