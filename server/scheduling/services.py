from datetime import timedelta, datetime
from django.utils import timezone
from django.db import transaction, IntegrityError
from .models import TrainerSchedulingSettings, TrainerAvailability, BlockedDate, TrainerSlot, PersonalTrainingSession
from client_management.models import TrainerAssignment

def generate_slots_for_trainer(trainer, start_date, end_date):
    """
    Generates bookable slots for the trainer between start_date and end_date.
    Only generates complete session_duration intervals.
    Skips blocked dates.
    Ignores existing slots.
    """
    try:
        settings = TrainerSchedulingSettings.objects.get(trainer=trainer)
        duration_minutes = settings.session_duration
    except TrainerSchedulingSettings.DoesNotExist:
        # Default to 60 mins if no settings configured
        duration_minutes = 60

    availabilities = TrainerAvailability.objects.filter(trainer=trainer, is_available=True)
    if not availabilities.exists():
        return 0  # No availabilities set

    blocked_dates = set(BlockedDate.objects.filter(
        trainer=trainer,
        date__gte=start_date,
        date__lte=end_date
    ).values_list('date', flat=True))

    current_date = start_date
    slots_created = 0

    while current_date <= end_date:
        if current_date in blocked_dates:
            current_date += timedelta(days=1)
            continue

        day_of_week = current_date.weekday() # 0 = Monday, 6 = Sunday
        daily_availabilities = availabilities.filter(day_of_week=day_of_week)

        for avail in daily_availabilities:
            # Create datetime objects for easy math
            start_dt = datetime.combine(current_date, avail.start_time)
            end_dt = datetime.combine(current_date, avail.end_time)
            
            current_slot_start = start_dt
            
            while current_slot_start + timedelta(minutes=duration_minutes) <= end_dt:
                current_slot_end = current_slot_start + timedelta(minutes=duration_minutes)
                
                try:
                    # Use get_or_create to silently ignore existing slots
                    obj, created = TrainerSlot.objects.get_or_create(
                        trainer=trainer,
                        date=current_date,
                        start_time=current_slot_start.time(),
                        defaults={
                            'end_time': current_slot_end.time(),
                            'status': TrainerSlot.Status.AVAILABLE
                        }
                    )
                    if created:
                        slots_created += 1
                except IntegrityError:
                    pass # Handled by UniqueConstraint just in case
                
                current_slot_start = current_slot_end

        current_date += timedelta(days=1)

    return slots_created


def block_date_and_slots(trainer, date, reason=""):
    """
    Blocks a specific date for a trainer and updates all their AVAILABLE slots
    on that date to BLOCKED. BOOKED slots are not affected.
    """
    blocked_date, created = BlockedDate.objects.get_or_create(
        trainer=trainer,
        date=date,
        defaults={'reason': reason}
    )

    # Update existing available slots to blocked
    slots_blocked = TrainerSlot.objects.filter(
        trainer=trainer,
        date=date,
        status=TrainerSlot.Status.AVAILABLE
    ).update(status=TrainerSlot.Status.BLOCKED)

    return blocked_date, slots_blocked


def unblock_date_and_slots(trainer, date):
    """
    Removes a BlockedDate and reverts BLOCKED slots to AVAILABLE on that date.
    """
    BlockedDate.objects.filter(trainer=trainer, date=date).delete()

    slots_unblocked = TrainerSlot.objects.filter(
        trainer=trainer,
        date=date,
        status=TrainerSlot.Status.BLOCKED
    ).update(status=TrainerSlot.Status.AVAILABLE)
    
    return slots_unblocked


# ── Booking Services (Module 13) ─────────────────────────────────────────────

def _verify_assignment(client, trainer):
    if not TrainerAssignment.objects.filter(client=client, trainer=trainer, is_active=True).exists():
        raise ValueError("You do not have an active assignment with this trainer.")

def _verify_no_overlap(client, date, start_time, end_time, exclude_session_id=None):
    overlapping = PersonalTrainingSession.objects.filter(
        client=client,
        date=date,
        status__in=[PersonalTrainingSession.Status.BOOKED, PersonalTrainingSession.Status.RESCHEDULED],
        start_time__lt=end_time,
        end_time__gt=start_time
    )
    if exclude_session_id:
        overlapping = overlapping.exclude(id=exclude_session_id)
    if overlapping.exists():
        raise ValueError("You already have a session booked during this time.")

def book_session(client, slot_id, notes=""):
    with transaction.atomic():
        try:
            slot = TrainerSlot.objects.select_for_update().get(id=slot_id)
        except TrainerSlot.DoesNotExist:
            raise ValueError("Slot not found.")
            
        if slot.status != TrainerSlot.Status.AVAILABLE:
            raise ValueError("This slot is no longer available.")
            
        _verify_assignment(client, slot.trainer)
        _verify_no_overlap(client, slot.date, slot.start_time, slot.end_time)

        session = PersonalTrainingSession.objects.create(
            client=client,
            trainer=slot.trainer,
            slot=slot,
            date=slot.date,
            start_time=slot.start_time,
            end_time=slot.end_time,
            notes=notes,
            status=PersonalTrainingSession.Status.BOOKED
        )
        
        slot.status = TrainerSlot.Status.BOOKED
        slot.save(update_fields=['status'])
        
        return session

def reschedule_session(client, session_id, new_slot_id):
    with transaction.atomic():
        try:
            session = PersonalTrainingSession.objects.select_for_update().get(id=session_id, client=client)
        except PersonalTrainingSession.DoesNotExist:
            raise ValueError("Session not found.")
            
        if session.status not in [PersonalTrainingSession.Status.BOOKED, PersonalTrainingSession.Status.RESCHEDULED]:
            raise ValueError("Cannot reschedule this session.")
            
        try:
            new_slot = TrainerSlot.objects.select_for_update().get(id=new_slot_id)
        except TrainerSlot.DoesNotExist:
            raise ValueError("New slot not found.")
            
        if new_slot.status != TrainerSlot.Status.AVAILABLE:
            raise ValueError("New slot is no longer available.")
            
        if session.trainer != new_slot.trainer:
            raise ValueError("Cannot reschedule with a different trainer through this endpoint.")

        _verify_no_overlap(client, new_slot.date, new_slot.start_time, new_slot.end_time, exclude_session_id=session.id)

        old_slot = session.slot
        
        # Free old slot
        old_slot.status = TrainerSlot.Status.AVAILABLE
        old_slot.save(update_fields=['status'])
        
        # Book new slot
        new_slot.status = TrainerSlot.Status.BOOKED
        new_slot.save(update_fields=['status'])
        
        # Update session
        session.slot = new_slot
        session.date = new_slot.date
        session.start_time = new_slot.start_time
        session.end_time = new_slot.end_time
        session.status = PersonalTrainingSession.Status.RESCHEDULED
        session.save()
        
        return session

def cancel_session(user, session_id, is_trainer=False):
    with transaction.atomic():
        filters = {'id': session_id}
        if is_trainer:
            filters['trainer'] = user
        else:
            filters['client'] = user
            
        try:
            session = PersonalTrainingSession.objects.select_for_update().get(**filters)
        except PersonalTrainingSession.DoesNotExist:
            raise ValueError("Session not found.")
            
        if session.status not in [PersonalTrainingSession.Status.BOOKED, PersonalTrainingSession.Status.RESCHEDULED]:
            raise ValueError("Session is not active.")
            
        slot = session.slot
        slot.status = TrainerSlot.Status.AVAILABLE
        slot.save(update_fields=['status'])
        
        session.status = PersonalTrainingSession.Status.CANCELLED
        session.save(update_fields=['status'])
        
        return session

def complete_session(trainer, session_id):
    with transaction.atomic():
        try:
            session = PersonalTrainingSession.objects.select_for_update().get(id=session_id, trainer=trainer)
        except PersonalTrainingSession.DoesNotExist:
            raise ValueError("Session not found.")
            
        if session.status not in [PersonalTrainingSession.Status.BOOKED, PersonalTrainingSession.Status.RESCHEDULED]:
            raise ValueError("Only active sessions can be marked as completed.")
            
        session.status = PersonalTrainingSession.Status.COMPLETED
        session.completed_at = timezone.now()
        session.save(update_fields=['status', 'completed_at'])
        
        return session

