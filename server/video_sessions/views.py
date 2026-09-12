from rest_framework import views, generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.db.models import Sum, Count, Avg, F

from .models import VideoSession
from .serializers import VideoSessionSerializer, VideoSessionJoinResponseSerializer
from .services import join_video_session, start_video_session, end_video_session, get_or_create_video_session
from scheduling.models import PersonalTrainingSession
from group_workouts.models import GroupWorkoutSession

class VideoSessionInitView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        personal_id = request.data.get('personal_session_id')
        group_id = request.data.get('group_session_id')
        user = request.user
        
        try:
            if personal_id:
                ps = PersonalTrainingSession.objects.get(id=personal_id)
                # Authorization: only the trainer or client for this session
                if ps.trainer != user and ps.client != user:
                    return Response({"detail": "You are not authorized to access this session."}, status=403)
                session = get_or_create_video_session(personal_session=ps)
            elif group_id:
                gs = GroupWorkoutSession.objects.get(id=group_id)
                # Authorization: trainer or a joined participant
                from group_workouts.models import GroupWorkoutParticipant
                is_trainer = gs.group_workout.trainer == user
                is_participant = GroupWorkoutParticipant.objects.filter(session=gs, client=user, status='JOINED').exists()
                if not is_trainer and not is_participant:
                    return Response({"detail": "You are not authorized to access this session."}, status=403)
                session = get_or_create_video_session(group_session=gs)
            else:
                return Response({"detail": "Provide personal_session_id or group_session_id"}, status=400)
                
            return Response({"video_session_id": session.id}, status=200)
        except (PersonalTrainingSession.DoesNotExist, GroupWorkoutSession.DoesNotExist):
            return Response({"detail": "Session not found."}, status=404)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

class VideoSessionJoinView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            data = join_video_session(request.user, pk)
            serializer = VideoSessionJoinResponseSerializer(data)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class VideoSessionStartView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            session = start_video_session(request.user, pk)
            serializer = VideoSessionSerializer(session)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class VideoSessionEndView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            session = end_video_session(request.user, pk)
            serializer = VideoSessionSerializer(session)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class VideoSessionDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    queryset = VideoSession.objects.all()
    serializer_class = VideoSessionSerializer

# ── Admin Analytics Views ────────────────────────────────────────────

class AdminVideoSessionLogsView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = VideoSessionSerializer
    queryset = VideoSession.objects.all().order_by('-created_at')

    def get_queryset(self):
        qs = super().get_queryset()
        stype = self.request.query_params.get('type')
        status_param = self.request.query_params.get('status')
        
        if stype == 'personal':
            qs = qs.filter(personal_session__isnull=False)
        elif stype == 'group':
            qs = qs.filter(group_session__isnull=False)
            
        if status_param:
            qs = qs.filter(status=status_param)
            
        return qs

class AdminVideoSessionAnalyticsView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        total = VideoSession.objects.count()
        completed = VideoSession.objects.filter(status=VideoSession.Status.ENDED).count()
        cancelled = VideoSession.objects.filter(status=VideoSession.Status.CANCELLED).count()
        no_show = VideoSession.objects.filter(status=VideoSession.Status.NO_SHOW).count()
        
        avg_dur_obj = VideoSession.objects.filter(status=VideoSession.Status.ENDED).aggregate(Avg('duration_seconds'))
        avg_dur_sec = avg_dur_obj['duration_seconds__avg'] or 0
        avg_dur_min = round(avg_dur_sec / 60)
        
        tot_vid_obj = VideoSession.objects.filter(status=VideoSession.Status.ENDED).aggregate(Sum('duration_seconds'))
        tot_vid_sec = tot_vid_obj['duration_seconds__sum'] or 0
        tot_vid_min = round(tot_vid_sec / 60)
        
        # Personal stats
        p_total = VideoSession.objects.filter(personal_session__isnull=False).count()
        p_avg_obj = VideoSession.objects.filter(personal_session__isnull=False, status=VideoSession.Status.ENDED).aggregate(Avg('duration_seconds'))
        p_avg_min = round((p_avg_obj['duration_seconds__avg'] or 0) / 60)
        
        # Group stats
        g_total = VideoSession.objects.filter(group_session__isnull=False).count()
        g_avg_obj = VideoSession.objects.filter(group_session__isnull=False, status=VideoSession.Status.ENDED).aggregate(Avg('duration_seconds'))
        g_avg_min = round((g_avg_obj['duration_seconds__avg'] or 0) / 60)
        
        # Trainer Performance
        def get_trainer_name(user):
            for attr in ['first_name', 'full_name', 'name']:
                val = getattr(user, attr, None)
                if val:
                    return val
            for rel in ['trainer_profile', 'client_profile']:
                try:
                    profile = getattr(user, rel)
                    for pattr in ['full_name', 'name', 'first_name']:
                        val = getattr(profile, pattr, None)
                        if val:
                            return val
                except Exception:
                    pass
            return user.email.split('@')[0]

        trainers = {}
        for vs in VideoSession.objects.filter(status=VideoSession.Status.ENDED):
            trainer_name = "Unknown"
            if vs.personal_session:
                trainer_name = get_trainer_name(vs.personal_session.trainer)
            elif vs.group_session:
                trainer_name = get_trainer_name(vs.group_session.group_workout.trainer)
                
            if trainer_name not in trainers:
                trainers[trainer_name] = {'sessions': 0, 'total_seconds': 0}
            
            trainers[trainer_name]['sessions'] += 1
            trainers[trainer_name]['total_seconds'] += vs.duration_seconds
            
        trainer_perf = []
        for name, data in trainers.items():
            trainer_perf.append({
                "trainer_name": name,
                "sessions": data['sessions'],
                "average_duration_minutes": round((data['total_seconds'] / data['sessions']) / 60) if data['sessions'] else 0
            })
            
        return Response({
            "overview": {
                "total_sessions": total,
                "completed": completed,
                "cancelled": cancelled,
                "no_show": no_show,
                "average_duration_minutes": avg_dur_min,
                "total_video_minutes": tot_vid_min
            },
            "session_type": {
                "personal": {
                    "total": p_total,
                    "average_duration_minutes": p_avg_min
                },
                "group": {
                    "total": g_total,
                    "average_duration_minutes": g_avg_min
                }
            },
            "trainer_performance": trainer_perf
        })
