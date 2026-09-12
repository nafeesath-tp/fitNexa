from django.db import transaction
from django.utils import timezone
from .models import GroupWorkoutSession, GroupWorkoutParticipant


def join_group_session(client, session_id):
    """
    Atomically joins a client to a group session.
    Uses select_for_update() to prevent race conditions on capacity.
    """
    with transaction.atomic():
        try:
            session = GroupWorkoutSession.objects.select_for_update().get(id=session_id)
        except GroupWorkoutSession.DoesNotExist:
            raise ValueError("Session not found.")

        if session.status != GroupWorkoutSession.Status.SCHEDULED:
            raise ValueError("This session is no longer available to join.")

        # Check if already joined (active booking)
        existing = GroupWorkoutParticipant.objects.filter(
            session=session, client=client, status=GroupWorkoutParticipant.Status.JOINED
        ).first()
        if existing:
            raise ValueError("You are already booked into this session.")

        # Count JOINED participants atomically (within the lock)
        joined_count = GroupWorkoutParticipant.objects.filter(
            session=session, status=GroupWorkoutParticipant.Status.JOINED
        ).count()

        if joined_count >= session.group_workout.capacity:
            raise ValueError("This session is full.")

        # Create or re-activate a cancelled booking
        participant, created = GroupWorkoutParticipant.objects.update_or_create(
            session=session,
            client=client,
            defaults={
                'status': GroupWorkoutParticipant.Status.JOINED,
                'cancelled_at': None
            }
        )

        return participant


def leave_group_session(client, session_id):
    """
    Cancels a client's booking for a group session.
    """
    with transaction.atomic():
        try:
            participant = GroupWorkoutParticipant.objects.select_for_update().get(
                session_id=session_id,
                client=client,
                status=GroupWorkoutParticipant.Status.JOINED
            )
        except GroupWorkoutParticipant.DoesNotExist:
            raise ValueError("You are not booked into this session.")

        participant.status = GroupWorkoutParticipant.Status.CANCELLED
        participant.cancelled_at = timezone.now()
        participant.save(update_fields=['status', 'cancelled_at'])

        return participant
