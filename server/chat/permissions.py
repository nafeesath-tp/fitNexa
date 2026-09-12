"""
chat/permissions.py — DRF permission classes for chat endpoints.
"""
from rest_framework.permissions import BasePermission


class IsConversationParticipant(BasePermission):
    """
    Allow access only to the client or trainer who belongs to this conversation.
    The view must set `self.get_conversation()` or the conversation is on the object.
    """
    message = "You are not a participant of this conversation."

    def has_object_permission(self, request, view, obj):
        # obj is a Conversation
        return obj.client == request.user or obj.trainer == request.user


class IsMessageConversationParticipant(BasePermission):
    """Allow access only if the user is part of the message's conversation."""
    message = "You are not a participant of this conversation."

    def has_object_permission(self, request, view, obj):
        # obj is a Message
        return (
            obj.conversation.client == request.user
            or obj.conversation.trainer == request.user
        )
