from rest_framework import generics, status, views, serializers as drf_serializers
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import TrainerSchedulingSettings, TrainerAvailability, BlockedDate, TrainerSlot, PersonalTrainingSession
from .serializers import (
    TrainerSchedulingSettingsSerializer, 
    TrainerAvailabilitySerializer, 
    BlockedDateSerializer, 
    TrainerSlotSerializer,
    PersonalTrainingSessionSerializer
)
from .services import (
    generate_slots_for_trainer, block_date_and_slots, unblock_date_and_slots,
    book_session, reschedule_session, cancel_session, complete_session, record_client_no_show
)
from client_management.models import TrainerAssignment
from accounts.models import User
from accounts.permissions import IsAdmin
from django.core.exceptions import ValidationError as DjangoValidationError
import datetime


class IsTrainerUser(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == 'TRAINER'


class TrainerSettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = TrainerSchedulingSettingsSerializer
    permission_classes = [IsTrainerUser]

    def get_object(self):
        obj, created = TrainerSchedulingSettings.objects.get_or_create(trainer=self.request.user)
        return obj


class TrainerAvailabilityListCreateView(generics.ListCreateAPIView):
    serializer_class = TrainerAvailabilitySerializer
    permission_classes = [IsTrainerUser]

    def get_queryset(self):
        return TrainerAvailability.objects.filter(trainer=self.request.user).order_by('day_of_week', 'start_time')

    def perform_create(self, serializer):
        try:
            instance = serializer.save(trainer=self.request.user)
            instance.clean()
            # Automatically generate slots for the next 14 days so clients can immediately book
            import datetime
            from .services import generate_slots_for_trainer
            today = datetime.date.today()
            generate_slots_for_trainer(self.request.user, today, today + datetime.timedelta(days=14))
        except DjangoValidationError as e:
            instance.delete()
            raise drf_serializers.ValidationError(e.message_dict if hasattr(e, 'message_dict') else {'detail': e.messages})


class TrainerAvailabilityDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TrainerAvailabilitySerializer
    permission_classes = [IsTrainerUser]

    def get_queryset(self):
        return TrainerAvailability.objects.filter(trainer=self.request.user)

    def perform_update(self, serializer):
        try:
            instance = serializer.save()
            instance.clean()
        except DjangoValidationError as e:
            raise drf_serializers.ValidationError(e.message_dict if hasattr(e, 'message_dict') else {'detail': e.messages})

    def perform_destroy(self, instance):
        trainer = instance.trainer
        day_of_week = instance.day_of_week
        super().perform_destroy(instance)
        
        # If no other availability remains for this day_of_week, remove unbooked available slots on this day of week
        if not TrainerAvailability.objects.filter(trainer=trainer, day_of_week=day_of_week).exists():
            import datetime
            today = datetime.date.today()
            slots = TrainerSlot.objects.filter(
                trainer=trainer,
                date__gte=today,
                status=TrainerSlot.Status.AVAILABLE
            )
            for s in slots:
                if s.date.weekday() == day_of_week:
                    s.delete()


class BlockedDateListCreateView(generics.ListCreateAPIView):
    serializer_class = BlockedDateSerializer
    permission_classes = [IsTrainerUser]

    def get_queryset(self):
        return BlockedDate.objects.filter(trainer=self.request.user).order_by('-date')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        date = serializer.validated_data['date']
        reason = serializer.validated_data.get('reason', '')
        
        # Check if already blocked
        if BlockedDate.objects.filter(trainer=request.user, date=date).exists():
            return Response({"detail": "Date is already blocked."}, status=status.HTTP_400_BAD_REQUEST)

        # Call service to block date and update slots
        blocked_date, slots_blocked = block_date_and_slots(request.user, date, reason)
        
        response_serializer = self.get_serializer(blocked_date)
        return Response({
            "blocked_date": response_serializer.data,
            "slots_affected": slots_blocked
        }, status=status.HTTP_201_CREATED)


class BlockedDateDetailView(generics.DestroyAPIView):
    permission_classes = [IsTrainerUser]

    def get_queryset(self):
        return BlockedDate.objects.filter(trainer=self.request.user)

    def perform_destroy(self, instance):
        unblock_date_and_slots(self.request.user, instance.date)


class TrainerSlotListView(generics.ListCreateAPIView):
    serializer_class = TrainerSlotSerializer
    permission_classes = [IsTrainerUser]

    def get_queryset(self):
        qs = TrainerSlot.objects.filter(trainer=self.request.user)
        # Optional date filtering
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
            
        return qs.order_by('date', 'start_time')

    def perform_create(self, serializer):
        trainer = self.request.user
        date = serializer.validated_data.get('date')
        start_time = serializer.validated_data.get('start_time')
        end_time = serializer.validated_data.get('end_time')

        if not end_time:
            settings_obj = TrainerSchedulingSettings.objects.filter(trainer=trainer).first()
            duration_minutes = settings_obj.session_duration if settings_obj else 45
            start_dt = datetime.datetime.combine(date, start_time)
            end_dt = start_dt + datetime.timedelta(minutes=duration_minutes)
            end_time = end_dt.time()

        # Handle duplicate slot gracefully
        existing = TrainerSlot.objects.filter(trainer=trainer, date=date, start_time=start_time).first()
        if existing:
            if existing.status == TrainerSlot.Status.BLOCKED:
                existing.status = TrainerSlot.Status.AVAILABLE
                existing.end_time = end_time
                existing.save(update_fields=['status', 'end_time'])
            serializer.instance = existing
            return

        serializer.save(trainer=trainer, end_time=end_time, status=TrainerSlot.Status.AVAILABLE)


class TrainerSlotDestroyView(generics.DestroyAPIView):
    permission_classes = [IsTrainerUser]

    def get_queryset(self):
        return TrainerSlot.objects.filter(trainer=self.request.user)

    def perform_destroy(self, instance):
        if instance.status == TrainerSlot.Status.BOOKED:
            raise drf_serializers.ValidationError({"detail": "Cannot delete a booked slot."})
        instance.delete()


class GenerateSlotsView(views.APIView):
    permission_classes = [IsTrainerUser]

    def post(self, request):
        start_date_str = request.data.get('start_date')
        end_date_str = request.data.get('end_date')

        if not start_date_str or not end_date_str:
            return Response({"detail": "start_date and end_date are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            start_date = datetime.date.fromisoformat(start_date_str)
            end_date = datetime.date.fromisoformat(end_date_str)
        except ValueError:
            return Response({"detail": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        if start_date > end_date:
            return Response({"detail": "start_date must be before end_date."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Limit generation to max 8 weeks to prevent abuse
        if (end_date - start_date).days > 56:
            return Response({"detail": "Cannot generate slots for more than 8 weeks at a time."}, status=status.HTTP_400_BAD_REQUEST)

        slots_created = generate_slots_for_trainer(request.user, start_date, end_date)
        
        return Response({
            "success": True,
            "message": f"Successfully generated {slots_created} new slots.",
            "slots_created": slots_created
        }, status=status.HTTP_200_OK)


class BlockSlotView(views.APIView):
    permission_classes = [IsTrainerUser]

    def patch(self, request, pk):
        try:
            slot = TrainerSlot.objects.get(pk=pk, trainer=request.user)
        except TrainerSlot.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if slot.status == TrainerSlot.Status.BOOKED:
            return Response({"detail": "Cannot block a booked slot."}, status=status.HTTP_400_BAD_REQUEST)

        slot.status = TrainerSlot.Status.BLOCKED
        slot.save(update_fields=['status'])
        
        serializer = TrainerSlotSerializer(slot)
        return Response(serializer.data)


class UnblockSlotView(views.APIView):
    permission_classes = [IsTrainerUser]

    def patch(self, request, pk):
        try:
            slot = TrainerSlot.objects.get(pk=pk, trainer=request.user)
        except TrainerSlot.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if slot.status != TrainerSlot.Status.BLOCKED:
            return Response({"detail": "Slot is not blocked."}, status=status.HTTP_400_BAD_REQUEST)

        # Check if the whole date is blocked
        if BlockedDate.objects.filter(trainer=request.user, date=slot.date).exists():
            return Response({"detail": "Cannot unblock slot because the entire date is blocked."}, status=status.HTTP_400_BAD_REQUEST)

        slot.status = TrainerSlot.Status.AVAILABLE
        slot.save(update_fields=['status'])
        
        serializer = TrainerSlotSerializer(slot)
        return Response(serializer.data)


# ── Client Views (Module 13) ─────────────────────────────────────────────

class IsClientUser(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == 'CLIENT'

class ClientTrainerListView(views.APIView):
    permission_classes = [IsClientUser]
    
    def get(self, request):
        assignments = TrainerAssignment.objects.filter(client=request.user, is_active=True)
        trainers = []
        for a in assignments:
            trainers.append({
                "id": a.trainer.id,
                "email": a.trainer.email,
                "name": f"{a.trainer.trainer_profile.first_name} {a.trainer.trainer_profile.last_name}" if hasattr(a.trainer, 'trainer_profile') else a.trainer.email
            })
        return Response(trainers)

class ClientAvailableSlotsView(generics.ListAPIView):
    serializer_class = TrainerSlotSerializer
    permission_classes = [IsClientUser]
    
    def get_queryset(self):
        trainer_id = self.request.query_params.get('trainer_id')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if not trainer_id:
            return TrainerSlot.objects.none()
            
        # Verify assignment
        if not TrainerAssignment.objects.filter(client=self.request.user, trainer_id=trainer_id, is_active=True).exists():
            return TrainerSlot.objects.none()
            
        qs = TrainerSlot.objects.filter(
            trainer_id=trainer_id,
            status=TrainerSlot.Status.AVAILABLE,
            date__gte=datetime.date.today()
        )
        
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
            
        return qs.order_by('date', 'start_time')

class ClientBookSessionView(views.APIView):
    permission_classes = [IsClientUser]
    
    def post(self, request):
        slot_id = request.data.get('slot_id')
        notes = request.data.get('notes', '')
        
        if not slot_id:
            return Response({"detail": "slot_id is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            session = book_session(request.user, slot_id, notes)
            serializer = PersonalTrainingSessionSerializer(session)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ClientSessionListView(generics.ListAPIView):
    serializer_class = PersonalTrainingSessionSerializer
    permission_classes = [IsClientUser]
    
    def get_queryset(self):
        return PersonalTrainingSession.objects.filter(client=self.request.user).order_by('-date', '-start_time')

class ClientRescheduleSessionView(views.APIView):
    permission_classes = [IsClientUser]
    
    def patch(self, request, pk):
        new_slot_id = request.data.get('new_slot_id')
        
        if not new_slot_id:
            return Response({"detail": "new_slot_id is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            session = reschedule_session(request.user, pk, new_slot_id)
            serializer = PersonalTrainingSessionSerializer(session)
            return Response(serializer.data)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ClientCancelSessionView(views.APIView):
    permission_classes = [IsClientUser]
    
    def patch(self, request, pk):
        try:
            session = cancel_session(request.user, pk, is_trainer=False)
            serializer = PersonalTrainingSessionSerializer(session)
            return Response(serializer.data)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ── Trainer Views (Module 13) ────────────────────────────────────────────

class TrainerSessionListView(generics.ListAPIView):
    serializer_class = PersonalTrainingSessionSerializer
    permission_classes = [IsTrainerUser]
    
    def get_queryset(self):
        qs = PersonalTrainingSession.objects.filter(trainer=self.request.user)
        
        status_param = self.request.query_params.get('status')
        date_param = self.request.query_params.get('date')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if status_param:
            qs = qs.filter(status=status_param)
        if date_param:
            qs = qs.filter(date=date_param)
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
            
        return qs.order_by('date', 'start_time')

class TrainerCompleteSessionView(views.APIView):
    permission_classes = [IsTrainerUser]
    
    def patch(self, request, pk):
        try:
            session = complete_session(request.user, pk)
            serializer = PersonalTrainingSessionSerializer(session)
            return Response(serializer.data)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class TrainerCancelSessionView(views.APIView):
    permission_classes = [IsTrainerUser]

    def patch(self, request, pk):
        try:
            session = cancel_session(request.user, pk, is_trainer=True)
            serializer = PersonalTrainingSessionSerializer(session)
            return Response(serializer.data)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class TrainerNoShowSessionView(views.APIView):
    permission_classes = [IsTrainerUser]

    def patch(self, request, pk):
        try:
            session = record_client_no_show(request.user, pk)
            serializer = PersonalTrainingSessionSerializer(session)
            return Response(serializer.data)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
