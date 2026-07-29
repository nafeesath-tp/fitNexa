from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework.exceptions import PermissionDenied, ValidationError
from accounts.models import User
from .models import TrainerAssignment
from subscriptions.models import ClientSubscription
from .serializers import (
    AdminClientAssignmentListSerializer,
    TrainerClientListSerializer,
    TrainerClientDetailSerializer,
)


def get_admin_client_assignments(query_params=None):
    """
    Returns all clients with their active subscription plan and current trainer assignment.
    Supports filtering by assignment status and searching by name/email.
    """
    query_params = query_params or {}
    queryset = User.objects.filter(role=User.Role.CLIENT).order_by("-created_at")
    
    search_query = query_params.get("search", "").strip()
    if search_query:
        queryset = queryset.filter(
            Q(first_name__icontains=search_query) |
            Q(last_name__icontains=search_query) |
            Q(email__icontains=search_query)
        )
        
    status_filter = query_params.get("status", "").strip().lower()
    if status_filter == "assigned":
        queryset = queryset.filter(trainer_assignment__is_active=True)
    elif status_filter == "unassigned":
        queryset = queryset.filter(
            Q(trainer_assignment__isnull=True) | Q(trainer_assignment__is_active=False)
        )
        
    serializer = AdminClientAssignmentListSerializer(queryset, many=True)
    return serializer.data


def assign_trainer_to_client(admin_user, client, trainer, notes=""):
    """
    Assigns or reassigns an approved trainer to a client.
    Uses update_or_create to seamlessly handle new assignments and reassignments.
    Throws ValidationError if client is on a FREE plan.
    """
    # Enforce subscription logic: FREE users cannot be assigned a trainer
    active_sub = ClientSubscription.objects.filter(client=client, payment_status='ACTIVE').first()
    if not active_sub or active_sub.plan.name == 'FREE':
        raise ValidationError("Trainers can only be assigned to clients on Group or Premium plans.")

    assignment, created = TrainerAssignment.objects.update_or_create(
        client=client,
        defaults={
            "trainer": trainer,
            "assigned_by": admin_user,
            "is_active": True,
            "notes": notes,
        }
    )
    return assignment


def reassign_trainer(admin_user, client_id, trainer_id, notes=""):
    """
    Explicit reassignment service wrapper.
    """
    client = get_object_or_404(User, id=client_id, role=User.Role.CLIENT)
    trainer = get_object_or_404(User, id=trainer_id, role=User.Role.TRAINER)
    
    if not hasattr(trainer, "trainer_profile") or trainer.trainer_profile.approval_status != "APPROVED":
        raise ValidationError("Cannot assign an unapproved trainer.")
        
    return assign_trainer_to_client(admin_user, client, trainer, notes)


# ── Trainer Services ─────────────────────────────────────────────────────────

def get_trainer_assigned_clients(trainer_user):
    """
    Returns all active clients assigned to the requesting trainer.
    Enriched with BMI, health goals, and subscription tier.
    """
    assignments = TrainerAssignment.objects.filter(
        trainer=trainer_user, 
        is_active=True
    ).select_related("client", "client__client_profile")
    
    serializer = TrainerClientListSerializer(assignments, many=True)
    return serializer.data


def get_trainer_client_detail(trainer_user, client_id):
    """
    Returns exhaustive health stats and profile for a specific assigned client.
    Enforces strict security ownership check.
    """
    assignment = get_object_or_404(TrainerAssignment, client_id=client_id, is_active=True)
    
    if assignment.trainer != trainer_user:
        raise PermissionDenied("You do not have permission to view this client's details.")
        
    serializer = TrainerClientDetailSerializer(assignment)
    return serializer.data


def get_client_assigned_trainer(client_user):
    """
    Returns the trainer currently assigned to the authenticated client.
    Used by the Client Dashboard — no admin privileges required.
    Returns None if the client has not been assigned a trainer yet.
    """
    try:
        assignment = TrainerAssignment.objects.select_related(
            "trainer", "trainer__trainer_profile", "trainer__trainer_profile__specialization"
        ).get(client=client_user, is_active=True)
        
        trainer = assignment.trainer
        tp = getattr(trainer, "trainer_profile", None)
        return {
            "id": trainer.id,
            "email": trainer.email,
            "first_name": tp.first_name if tp else "",
            "last_name": tp.last_name if tp else "",
            "specialization": tp.specialization.name if tp and tp.specialization else None,
            "experience": tp.experience if tp else None,
            "bio": tp.bio if tp else "",
            "profile_image": tp.profile_image.url if tp and tp.profile_image else None,
            "assigned_at": assignment.assigned_at,
        }
    except TrainerAssignment.DoesNotExist:
        return None

