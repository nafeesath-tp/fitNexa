from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from accounts.models import User
from .models import TrainerAssignment, TrainerGroup, TrainerGroupMember
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
    Only shows GROUP and PREMIUM plan clients (excludes FREE-tier clients).
    Enriched with BMI, health goals, and subscription tier.
    """
    from django.db.models import Exists, OuterRef, Q
    from subscriptions.models import ClientSubscription as CS

    # Subquery: client has ACTIVE, non-expired GROUP or PREMIUM subscription
    has_paid_plan = CS.objects.filter(
        client=OuterRef('client'),
        payment_status='ACTIVE',
    ).exclude(plan__name='FREE').filter(
        Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
    )

    assignments = TrainerAssignment.objects.filter(
        trainer=trainer_user,
        is_active=True,
    ).annotate(
        has_paid=Exists(has_paid_plan)
    ).filter(
        has_paid=True
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


# ── Trainer Group (Batch/Cohort) Services ────────────────────────────────────

def create_trainer_group(trainer_user, data):
    """Create a new named group/batch for the trainer."""
    name        = data.get("name", "").strip()
    description = data.get("description", "")
    max_members = data.get("max_members", 10)
    if not name:
        raise ValidationError({"name": "Group name is required."})
    group = TrainerGroup.objects.create(
        trainer=trainer_user, name=name,
        description=description, max_members=max_members,
    )
    return _serialize_group(group)


def get_trainer_groups(trainer_user):
    """List all active groups created by this trainer."""
    groups = TrainerGroup.objects.filter(
        trainer=trainer_user, is_active=True
    ).prefetch_related("members__trainer_assignment__client__client_profile")
    return [_serialize_group(g) for g in groups]


def get_trainer_group_detail(trainer_user, group_id):
    """Full detail of a single group including all members."""
    group = get_object_or_404(TrainerGroup, id=group_id, trainer=trainer_user, is_active=True)
    return _serialize_group(group, detailed=True)


def update_trainer_group(trainer_user, group_id, data):
    """Update group name, description, or max_members."""
    group = get_object_or_404(TrainerGroup, id=group_id, trainer=trainer_user, is_active=True)
    for field in ["name", "description", "max_members"]:
        if field in data:
            setattr(group, field, data[field])
    group.save()
    return _serialize_group(group)


def delete_trainer_group(trainer_user, group_id):
    """Soft-delete a group."""
    group = get_object_or_404(TrainerGroup, id=group_id, trainer=trainer_user, is_active=True)
    group.is_active = False
    group.save(update_fields=["is_active", "updated_at"])


def add_member_to_group(trainer_user, group_id, trainer_assignment_id):
    """
    Add a GROUP-plan client to a batch group.
    Validates: trainer owns the TA, client on GROUP plan, group not full, not already grouped.
    """
    group = get_object_or_404(TrainerGroup, id=group_id, trainer=trainer_user, is_active=True)
    ta    = get_object_or_404(TrainerAssignment, id=trainer_assignment_id, trainer=trainer_user, is_active=True)

    active_sub = ClientSubscription.objects.filter(
        client=ta.client, payment_status="ACTIVE"
    ).select_related("plan").first()
    if not active_sub or active_sub.plan.name != "GROUP":
        raise ValidationError({"detail": "Only GROUP plan clients can be added to a group."})

    if group.is_full:
        raise ValidationError({"detail": f"Group '{group.name}' is full ({group.max_members} members max)."})

    if TrainerGroupMember.objects.filter(trainer_assignment=ta).exists():
        raise ValidationError({"detail": "This client is already in a group."})

    membership = TrainerGroupMember.objects.create(group=group, trainer_assignment=ta)
    return {
        "membership_id": membership.id,
        "client_email": ta.client.email,
        "group_name": group.name,
    }


def remove_member_from_group(trainer_user, group_id, trainer_assignment_id):
    """Remove a client from the group."""
    group = get_object_or_404(TrainerGroup, id=group_id, trainer=trainer_user, is_active=True)
    ta    = get_object_or_404(TrainerAssignment, id=trainer_assignment_id, trainer=trainer_user)
    membership = get_object_or_404(TrainerGroupMember, group=group, trainer_assignment=ta)
    membership.delete()


def get_group_eligible_clients(trainer_user, group_id):
    """
    Returns trainer's GROUP-plan clients not yet in any group.
    Eligible to be added to the given group.
    """
    get_object_or_404(TrainerGroup, id=group_id, trainer=trainer_user, is_active=True)
    all_tas = TrainerAssignment.objects.filter(
        trainer=trainer_user, is_active=True
    ).select_related("client", "client__client_profile")

    eligible = []
    for ta in all_tas:
        active_sub = ClientSubscription.objects.filter(
            client=ta.client, payment_status="ACTIVE"
        ).select_related("plan").first()
        if not active_sub or active_sub.plan.name != "GROUP":
            continue
        if TrainerGroupMember.objects.filter(trainer_assignment=ta).exists():
            continue
        tp = getattr(ta.client, "client_profile", None)
        eligible.append({
            "trainer_assignment_id": ta.id,
            "client_id": ta.client.id,
            "email": ta.client.email,
            "first_name": tp.first_name if tp else "",
            "last_name": tp.last_name if tp else "",
        })
    return eligible


# ── Private helper ──────────────────────────────────────────────────────────────────

def _serialize_group(group, detailed=False):
    members = []
    for m in group.members.select_related(
        "trainer_assignment__client", "trainer_assignment__client__client_profile"
    ):
        tp = getattr(m.trainer_assignment.client, "client_profile", None)
        members.append({
            "trainer_assignment_id": m.trainer_assignment.id,
            "client_id": m.trainer_assignment.client.id,
            "email": m.trainer_assignment.client.email,
            "first_name": tp.first_name if tp else "",
            "last_name": tp.last_name if tp else "",
            "joined_at": m.joined_at,
        })
    return {
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "max_members": group.max_members,
        "member_count": group.member_count,
        "is_full": group.is_full,
        "created_at": group.created_at,
        "members": members if detailed else [],
    }
