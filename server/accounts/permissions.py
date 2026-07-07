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
