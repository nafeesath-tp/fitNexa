import uuid
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from livekit import api
from .models import VideoSession
from group_workouts.models import GroupWorkoutParticipant

def get_or_create_video_session(personal_session=None, group_session=None):
    if personal_session:
        session, created = VideoSession.objects.get_or_create(
            personal_session=personal_session,
            defaults={'room_name': f"fitnexa-personal-{personal_session.id}-{uuid.uuid4().hex[:8]}"}
        )
        return session
    elif group_session:
        session, created = VideoSession.objects.get_or_create(
            group_session=group_session,
            defaults={'room_name': f"fitnexa-group-{group_session.id}-{uuid.uuid4().hex[:8]}"}
        )
        return session
    else:
        raise ValueError("Must provide either personal_session or group_session")

def _verify_authorization(user, video_session):
    if video_session.personal_session:
        ps = video_session.personal_session
        if ps.client == user:
            return True, "CLIENT"
        if ps.trainer == user:
            return True, "TRAINER"
        raise ValueError("You are not authorized to join this personal session.")
    
    if video_session.group_session:
        gs = video_session.group_session
        if gs.group_workout.trainer == user:
            return True, "TRAINER"
        if GroupWorkoutParticipant.objects.filter(session=gs, client=user).exists():
            return True, "CLIENT"
        raise ValueError("You are not authorized to join this group session.")
        
    raise ValueError("Invalid session configuration.")

def join_video_session(user, video_session_id):
    try:
        video_session = VideoSession.objects.get(id=video_session_id)
    except VideoSession.DoesNotExist:
        raise ValueError("Video session not found.")
        
    if video_session.status in [VideoSession.Status.CANCELLED, VideoSession.Status.NO_SHOW, VideoSession.Status.ENDED]:
        raise ValueError(f"Cannot join a session that is {video_session.status}.")

    # Authorization
    is_authorized, role = _verify_authorization(user, video_session)
    
    # Generate token
    identity = f"user-{user.id}"
    
    # Build display name — use profile if available, fall back to email prefix
    display_name = identity
    for attr in ['first_name', 'full_name', 'name']:
        if hasattr(user, attr) and getattr(user, attr):
            display_name = getattr(user, attr)
            break
    else:
        # Try to get from profile relations
        for rel in ['trainer_profile', 'client_profile']:
            try:
                profile = getattr(user, rel)
                for pattr in ['full_name', 'name', 'first_name']:
                    val = getattr(profile, pattr, None)
                    if val:
                        display_name = val
                        break
                break
            except Exception:
                pass
        else:
            display_name = user.email.split('@')[0]
    
    token = (
        api.AccessToken(
            settings.LIVEKIT_API_KEY,
            settings.LIVEKIT_API_SECRET,
        )
        .with_identity(identity)
        .with_name(display_name)
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room=video_session.room_name,
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True,
            )
        )
        .to_jwt()
    )

    return {
        "room_name": video_session.room_name,
        "server_url": settings.LIVEKIT_URL,
        "token": token
    }

def start_video_session(trainer, video_session_id):
    with transaction.atomic():
        try:
            video_session = VideoSession.objects.select_for_update().get(id=video_session_id)
        except VideoSession.DoesNotExist:
            raise ValueError("Video session not found.")
            
        # Verify trainer
        is_authorized, role = _verify_authorization(trainer, video_session)
        if role != "TRAINER":
            raise ValueError("Only the trainer can start the session.")
            
        if video_session.status in [VideoSession.Status.CANCELLED, VideoSession.Status.ENDED]:
            raise ValueError(f"Cannot start a session that is {video_session.status}.")
            
        if video_session.status != VideoSession.Status.LIVE:
            video_session.status = VideoSession.Status.LIVE
            video_session.started_at = timezone.now()
        
        if not video_session.trainer_joined_at:
            video_session.trainer_joined_at = timezone.now()
            
        video_session.save(update_fields=['status', 'started_at', 'trainer_joined_at'])
        
        return video_session

def end_video_session(trainer, video_session_id):
    with transaction.atomic():
        try:
            video_session = VideoSession.objects.select_for_update().get(id=video_session_id)
        except VideoSession.DoesNotExist:
            raise ValueError("Video session not found.")
            
        is_authorized, role = _verify_authorization(trainer, video_session)
        if role != "TRAINER":
            raise ValueError("Only the trainer can end the session.")
            
        # Idempotent
        if video_session.status == VideoSession.Status.ENDED:
            return video_session
            
        video_session.status = VideoSession.Status.ENDED
        video_session.ended_at = timezone.now()
        
        if not video_session.trainer_left_at:
            video_session.trainer_left_at = timezone.now()
            
        if video_session.started_at:
            duration = (video_session.ended_at - video_session.started_at).total_seconds()
            video_session.duration_seconds = max(0, int(duration))
            
        video_session.save(update_fields=['status', 'ended_at', 'trainer_left_at', 'duration_seconds'])
        
        # Also mark the parent PersonalTrainingSession as COMPLETED automatically
        if video_session.personal_session and video_session.personal_session.status in ['BOOKED', 'RESCHEDULED']:
            from scheduling.models import PersonalTrainingSession
            ps = video_session.personal_session
            ps.status = PersonalTrainingSession.Status.COMPLETED
            ps.completed_at = timezone.now()
            ps.save(update_fields=['status', 'completed_at'])
            
        return video_session
