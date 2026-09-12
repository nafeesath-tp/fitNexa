"""
chat/views.py — REST API views for Chat.

Endpoints:
  GET/POST  /api/chat/conversations/
  GET       /api/chat/conversations/<id>/
  GET/POST  /api/chat/conversations/<id>/messages/
  POST      /api/chat/messages/<id>/report/
  GET       /api/chat/admin/reports/
  POST      /api/chat/admin/reports/<id>/review/
"""
import os
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import generics, views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Conversation, Message, ChatReport, ALLOWED_EXTENSIONS, MAX_FILE_SIZE_MB
from .serializers import (
    ConversationListSerializer,
    ConversationDetailSerializer,
    MessageSerializer,
    ChatReportSerializer,
)
from .permissions import IsConversationParticipant, IsMessageConversationParticipant
from client_management.models import TrainerAssignment

User = get_user_model()


# ── Helper ──────────────────────────────────────────────────────────────────

def _has_active_assignment(client, trainer):
    """Return True if client is actively assigned to trainer."""
    return TrainerAssignment.objects.filter(
        client=client, trainer=trainer, is_active=True
    ).exists()


# ── Conversations ────────────────────────────────────────────────────────────

class ConversationListCreateView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return all conversations the logged-in user belongs to."""
        user = request.user
        if user.role == 'CLIENT':
            convs = Conversation.objects.filter(client=user).select_related('trainer', 'client')
        elif user.role == 'TRAINER':
            convs = Conversation.objects.filter(trainer=user).select_related('trainer', 'client')
        else:
            # Admin — return all
            convs = Conversation.objects.all().select_related('trainer', 'client')

        serializer = ConversationListSerializer(convs, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        """
        Client starts or retrieves a conversation with their assigned trainer.
        Body: { "trainer_id": 8 }
        """
        user = request.user
        if user.role != 'CLIENT':
            return Response(
                {"detail": "Only clients can initiate conversations."},
                status=status.HTTP_403_FORBIDDEN,
            )

        trainer_id = request.data.get('trainer_id')
        if not trainer_id:
            return Response({"detail": "trainer_id is required."}, status=400)

        try:
            trainer = User.objects.get(id=trainer_id, role='TRAINER', is_active=True)
        except User.DoesNotExist:
            return Response({"detail": "Trainer not found."}, status=404)

        # Security: verify active assignment
        if not _has_active_assignment(user, trainer):
            return Response(
                {"detail": "You do not have an active assignment with this trainer."},
                status=status.HTTP_403_FORBIDDEN,
            )

        conversation, created = Conversation.objects.get_or_create(
            client=user, trainer=trainer
        )
        serializer = ConversationDetailSerializer(conversation, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ConversationDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated, IsConversationParticipant]
    serializer_class = ConversationDetailSerializer
    queryset = Conversation.objects.all()

    def get_object(self):
        obj = super().get_object()
        self.check_object_permissions(self.request, obj)
        return obj


# ── Messages ─────────────────────────────────────────────────────────────────

class MessageListCreateView(views.APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get_conversation(self, request, pk):
        try:
            conv = Conversation.objects.get(pk=pk)
        except Conversation.DoesNotExist:
            return None, Response({"detail": "Conversation not found."}, status=404)

        if conv.client != request.user and conv.trainer != request.user:
            return None, Response(
                {"detail": "You are not a participant of this conversation."},
                status=403,
            )
        return conv, None

    def get(self, request, pk):
        """Return paginated messages for a conversation."""
        conv, err = self._get_conversation(request, pk)
        if err:
            return err

        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 30))
        offset = (page - 1) * page_size

        messages = conv.messages.select_related('sender').order_by('-created_at')[offset:offset + page_size]
        # Return in chronological order
        serializer = MessageSerializer(reversed(list(messages)), many=True, context={'request': request})
        return Response({
            'results': serializer.data,
            'page': page,
            'page_size': page_size,
        })

    def post(self, request, pk):
        """Send a message (text, file, or both) to this conversation."""
        conv, err = self._get_conversation(request, pk)
        if err:
            return err

        content = request.data.get('content', '').strip()
        file = request.FILES.get('file')

        if not content and not file:
            return Response({"detail": "Message must have content or a file."}, status=400)

        # File validation
        if file:
            # Size check
            if file.size > MAX_FILE_SIZE_MB * 1024 * 1024:
                return Response(
                    {"detail": f"File exceeds {MAX_FILE_SIZE_MB}MB limit."},
                    status=400,
                )
            # Extension check
            original_name = file.name
            ext = original_name.rsplit('.', 1)[-1].lower() if '.' in original_name else ''
            if ext not in ALLOWED_EXTENSIONS:
                return Response(
                    {"detail": f"File type '.{ext}' is not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"},
                    status=400,
                )

        msg = Message(
            conversation=conv,
            sender=request.user,
            content=content,
        )
        if file:
            msg.file = file
            msg.file_name = file.name
        msg.save()

        # Touch conversation updated_at
        conv.save(update_fields=['updated_at'])

        serializer = MessageSerializer(msg, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ── Reports ──────────────────────────────────────────────────────────────────

class ReportMessageView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        """Report a message. User must be a participant of that message's conversation."""
        try:
            message = Message.objects.select_related('conversation').get(pk=pk)
        except Message.DoesNotExist:
            return Response({"detail": "Message not found."}, status=404)

        conv = message.conversation
        if conv.client != request.user and conv.trainer != request.user:
            return Response(
                {"detail": "You are not a participant of this conversation."},
                status=403,
            )

        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response({"detail": "reason is required."}, status=400)

        # Prevent duplicate reports from same user on same message
        report, created = ChatReport.objects.get_or_create(
            message=message,
            reported_by=request.user,
            defaults={'reason': reason},
        )
        if not created:
            return Response({"detail": "You have already reported this message."}, status=400)

        serializer = ChatReportSerializer(report)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ── Admin ─────────────────────────────────────────────────────────────────────

class AdminChatReportListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = ChatReportSerializer

    def get_queryset(self):
        qs = ChatReport.objects.select_related(
            'message', 'reported_by', 'reviewed_by'
        ).order_by('-created_at')
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param.upper())
        return qs


class AdminReviewReportView(views.APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        """Admin marks a report as REVIEWED or DISMISSED."""
        try:
            report = ChatReport.objects.get(pk=pk)
        except ChatReport.DoesNotExist:
            return Response({"detail": "Report not found."}, status=404)

        new_status = request.data.get('status', '').upper()
        if new_status not in ['REVIEWED', 'DISMISSED']:
            return Response(
                {"detail": "status must be REVIEWED or DISMISSED."},
                status=400,
            )

        report.status = new_status
        report.reviewed_by = request.user
        report.reviewed_at = timezone.now()
        report.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])

        serializer = ChatReportSerializer(report)
        return Response(serializer.data)
