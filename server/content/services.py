from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied
from .models import TrainingVideo
from .serializers import ClientTrainingVideoSerializer, AdminTrainingVideoSerializer


def get_client_active_plan(user):
    """
    Checks the user's current subscription from Module 5.
    Returns 'FREE', 'GROUP', or 'PREMIUM'.
    """
    try:
        from subscriptions.models import ClientSubscription, PaymentStatus
        sub = ClientSubscription.objects.filter(
            client=user, 
            payment_status=PaymentStatus.ACTIVE
        ).order_by("-created_at").first()
        
        if sub and (not sub.expires_at or sub.expires_at > timezone.now()):
            return sub.plan.name.upper()
    except Exception:
        pass
    return "FREE"


def get_client_videos(user, query_params=None):
    """
    Returns published training videos for clients, filtered by query params.
    Includes is_locked and required_plan in serializer context based on active subscription.
    """
    query_params = query_params or {}
    client_plan = get_client_active_plan(user)
    
    queryset = TrainingVideo.objects.filter(is_published=True)
    
    # ── Multi-Dimensional Filtering ──────────────────────────────────────────
    specialization_id = query_params.get("specialization")
    if specialization_id and specialization_id != "all":
        queryset = queryset.filter(specialization_id=specialization_id)
        
    difficulty = query_params.get("difficulty")
    if difficulty and difficulty.upper() != "ALL":
        queryset = queryset.filter(difficulty=difficulty.upper())
        
    access_level = query_params.get("access_level")
    if access_level and access_level.upper() != "ALL":
        queryset = queryset.filter(access_level=access_level.upper())
        
    search = query_params.get("search")
    if search:
        queryset = queryset.filter(
            Q(title__icontains=search) | Q(description__icontains=search)
        )
        
    serializer = ClientTrainingVideoSerializer(
        queryset, 
        many=True, 
        context={"client_plan": client_plan}
    )
    return serializer.data


def get_client_video_detail(user, video_id):
    """
    Returns detail for a single video. If locked, video_url is None and required_plan is set.
    """
    client_plan = get_client_active_plan(user)
    video = get_object_or_404(TrainingVideo, id=video_id, is_published=True)
    
    serializer = ClientTrainingVideoSerializer(
        video, 
        context={"client_plan": client_plan}
    )
    return serializer.data


# ── Admin CRUD Services ──────────────────────────────────────────────────────

def get_admin_videos(query_params=None):
    """
    Returns all training videos (published & unpublished) for Admin management studio.
    Supports filtering across all 3 dimensions and title search.
    """
    query_params = query_params or {}
    queryset = TrainingVideo.objects.all()
    
    specialization_id = query_params.get("specialization")
    if specialization_id and specialization_id != "all":
        queryset = queryset.filter(specialization_id=specialization_id)
        
    difficulty = query_params.get("difficulty")
    if difficulty and difficulty.upper() != "ALL":
        queryset = queryset.filter(difficulty=difficulty.upper())
        
    access_level = query_params.get("access_level")
    if access_level and access_level.upper() != "ALL":
        queryset = queryset.filter(access_level=access_level.upper())
        
    search = query_params.get("search")
    if search:
        queryset = queryset.filter(
            Q(title__icontains=search) | Q(description__icontains=search)
        )
        
    serializer = AdminTrainingVideoSerializer(queryset, many=True)
    return serializer.data


def get_admin_video_detail(video_id):
    video = get_object_or_404(TrainingVideo, id=video_id)
    serializer = AdminTrainingVideoSerializer(video)
    return serializer.data


def create_training_video(admin_user, data):
    serializer = AdminTrainingVideoSerializer(data=data)
    if serializer.is_valid():
        serializer.save(uploaded_by=admin_user)
        return serializer.data
    raise ValidationError(serializer.errors)


def update_training_video(video_id, data):
    video = get_object_or_404(TrainingVideo, id=video_id)
    serializer = AdminTrainingVideoSerializer(video, data=data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return serializer.data
    raise ValidationError(serializer.errors)


def delete_training_video(video_id):
    video = get_object_or_404(TrainingVideo, id=video_id)
    video.delete()
    return True
