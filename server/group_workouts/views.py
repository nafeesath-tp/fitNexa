from rest_framework import generics, views, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import datetime

from .models import GroupWorkout, GroupWorkoutSession, GroupWorkoutParticipant
from .serializers import (
    GroupWorkoutSerializer, GroupWorkoutSessionSerializer,
    GroupWorkoutSessionWriteSerializer, GroupWorkoutParticipantSerializer,
    AdminGroupWorkoutSessionSerializer
)
from .services import join_group_session, leave_group_session


class IsTrainer(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == 'TRAINER'


class IsClient(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == 'CLIENT'


class IsAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == 'ADMIN'


# ── Trainer Views ──────────────────────────────────────────────────────────────

class TrainerGroupWorkoutListCreateView(generics.ListCreateAPIView):
    serializer_class = GroupWorkoutSerializer
    permission_classes = [IsTrainer]

    def get_queryset(self):
        return GroupWorkout.objects.filter(trainer=self.request.user)

    def perform_create(self, serializer):
        serializer.save(trainer=self.request.user)


class TrainerGroupWorkoutDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GroupWorkoutSerializer
    permission_classes = [IsTrainer]

    def get_queryset(self):
        return GroupWorkout.objects.filter(trainer=self.request.user)


class TrainerSessionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsTrainer]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return GroupWorkoutSessionWriteSerializer
        return GroupWorkoutSessionSerializer

    def get_queryset(self):
        workout_id = self.kwargs.get('workout_id')
        return GroupWorkoutSession.objects.filter(group_workout_id=workout_id, group_workout__trainer=self.request.user)

    def perform_create(self, serializer):
        workout_id = self.kwargs.get('workout_id')
        try:
            workout = GroupWorkout.objects.get(id=workout_id, trainer=self.request.user)
        except GroupWorkout.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Group workout not found.")
        serializer.save(group_workout=workout)


class TrainerSessionDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsTrainer]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return GroupWorkoutSessionWriteSerializer
        return GroupWorkoutSessionSerializer

    def get_queryset(self):
        return GroupWorkoutSession.objects.filter(group_workout__trainer=self.request.user)


class TrainerSessionParticipantsView(generics.ListAPIView):
    serializer_class = GroupWorkoutParticipantSerializer
    permission_classes = [IsTrainer]

    def get_queryset(self):
        session_id = self.kwargs.get('session_id')
        return GroupWorkoutParticipant.objects.filter(
            session_id=session_id,
            session__group_workout__trainer=self.request.user
        ).order_by('booked_at')


class TrainerCompleteSessionView(views.APIView):
    permission_classes = [IsTrainer]

    def patch(self, request, session_id):
        try:
            session = GroupWorkoutSession.objects.get(id=session_id, group_workout__trainer=request.user)
        except GroupWorkoutSession.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if session.status != GroupWorkoutSession.Status.SCHEDULED:
            return Response({'detail': 'Only scheduled sessions can be marked as completed.'}, status=status.HTTP_400_BAD_REQUEST)

        session.status = GroupWorkoutSession.Status.COMPLETED
        session.save(update_fields=['status'])
        return Response({'detail': 'Session marked as completed.'})


class TrainerCancelSessionView(views.APIView):
    permission_classes = [IsTrainer]

    def patch(self, request, session_id):
        try:
            session = GroupWorkoutSession.objects.get(id=session_id, group_workout__trainer=request.user)
        except GroupWorkoutSession.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if session.status == GroupWorkoutSession.Status.COMPLETED:
            return Response({'detail': 'Cannot cancel a completed session.'}, status=status.HTTP_400_BAD_REQUEST)

        session.status = GroupWorkoutSession.Status.CANCELLED
        session.save(update_fields=['status'])
        return Response({'detail': 'Session cancelled.'})


# ── Client Views ───────────────────────────────────────────────────────────────

class ClientGroupWorkoutListView(generics.ListAPIView):
    serializer_class = GroupWorkoutSerializer
    permission_classes = [IsClient]

    def get_queryset(self):
        qs = GroupWorkout.objects.filter(is_active=True)
        specialization = self.request.query_params.get('specialization')
        level = self.request.query_params.get('level')
        if specialization:
            qs = qs.filter(specialization_id=specialization)
        if level:
            qs = qs.filter(level=level)
        return qs


class ClientGroupSessionListView(generics.ListAPIView):
    serializer_class = GroupWorkoutSessionSerializer
    permission_classes = [IsClient]

    def get_queryset(self):
        qs = GroupWorkoutSession.objects.filter(
            status=GroupWorkoutSession.Status.SCHEDULED,
            date__gte=datetime.date.today()
        ).select_related('group_workout', 'group_workout__trainer', 'group_workout__specialization')

        specialization = self.request.query_params.get('specialization')
        level = self.request.query_params.get('level')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        workout_id = self.request.query_params.get('workout_id')

        if specialization:
            qs = qs.filter(group_workout__specialization_id=specialization)
        if level:
            qs = qs.filter(group_workout__level=level)
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
        if workout_id:
            qs = qs.filter(group_workout_id=workout_id)

        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class ClientJoinSessionView(views.APIView):
    permission_classes = [IsClient]

    def post(self, request, session_id):
        try:
            participant = join_group_session(request.user, session_id)
            serializer = GroupWorkoutParticipantSerializer(participant)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ClientLeaveSessionView(views.APIView):
    permission_classes = [IsClient]

    def post(self, request, session_id):
        try:
            participant = leave_group_session(request.user, session_id)
            return Response({'detail': 'Successfully cancelled booking.'})
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ClientMySessionsView(generics.ListAPIView):
    serializer_class = GroupWorkoutSessionSerializer
    permission_classes = [IsClient]

    def get_queryset(self):
        return GroupWorkoutSession.objects.filter(
            participants__client=self.request.user,
            participants__status=GroupWorkoutParticipant.Status.JOINED
        ).select_related('group_workout').order_by('date', 'start_time')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


# ── Admin Views ────────────────────────────────────────────────────────────────

class AdminGroupWorkoutListView(generics.ListAPIView):
    serializer_class = GroupWorkoutSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return GroupWorkout.objects.all().select_related('trainer', 'specialization')


class AdminSessionReportView(generics.ListAPIView):
    serializer_class = AdminGroupWorkoutSessionSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return GroupWorkoutSession.objects.all().select_related(
            'group_workout', 'group_workout__trainer'
        ).order_by('-date')
