from rest_framework.permissions import BasePermission


class IsTrainer(BasePermission):
    """
    Allows access only to authenticated users with role == TRAINER.
    Usage: permission_classes = [IsAuthenticated, IsTrainer]
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "TRAINER"
        )


class IsAdmin(BasePermission):
    """
    Allows access only to authenticated users with role == ADMIN.
    Usage: permission_classes = [IsAuthenticated, IsAdmin]
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "ADMIN"
        )


class IsClient(BasePermission):
    """
    Allows access only to authenticated users with role == CLIENT.
    Usage: permission_classes = [IsAuthenticated, IsClient]
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "CLIENT"
        )


class IsApprovedTrainer(BasePermission):
    """
    Allows access only to authenticated users with role == TRAINER
    AND approval_status == APPROVED.
    Usage: permission_classes = [IsAuthenticated, IsTrainer, IsApprovedTrainer]
    """

    def has_permission(self, request, view):
        # We already know the user is authenticated and is a TRAINER if IsTrainer is also used.
        # But let's check everything just to be safe if used independently.
        if not (request.user and request.user.is_authenticated and request.user.role == "TRAINER"):
            return False

        # Trainer might not have completed onboarding yet
        if not hasattr(request.user, 'trainer_profile'):
            return False

        return request.user.trainer_profile.approval_status == "APPROVED"
