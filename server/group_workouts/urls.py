from django.urls import path
from .views import (
    # Trainer
    TrainerGroupWorkoutListCreateView,
    TrainerGroupWorkoutDetailView,
    TrainerSessionListCreateView,
    TrainerSessionDetailView,
    TrainerSessionParticipantsView,
    TrainerCompleteSessionView,
    TrainerCancelSessionView,
    # Client
    ClientGroupWorkoutListView,
    ClientGroupSessionListView,
    ClientJoinSessionView,
    ClientLeaveSessionView,
    ClientMySessionsView,
    # Admin
    AdminGroupWorkoutListView,
    AdminSessionReportView,
)

urlpatterns = [
    # ── Trainer ──
    path('trainer/group-workouts/', TrainerGroupWorkoutListCreateView.as_view(), name='trainer-gw-list'),
    path('trainer/group-workouts/<int:pk>/', TrainerGroupWorkoutDetailView.as_view(), name='trainer-gw-detail'),
    path('trainer/group-workouts/<int:workout_id>/sessions/', TrainerSessionListCreateView.as_view(), name='trainer-gw-session-list'),
    path('trainer/sessions/<int:pk>/', TrainerSessionDetailView.as_view(), name='trainer-gw-session-detail'),
    path('trainer/sessions/<int:session_id>/participants/', TrainerSessionParticipantsView.as_view(), name='trainer-gw-participants'),
    path('trainer/sessions/<int:session_id>/complete/', TrainerCompleteSessionView.as_view(), name='trainer-gw-complete'),
    path('trainer/sessions/<int:session_id>/cancel/', TrainerCancelSessionView.as_view(), name='trainer-gw-cancel'),

    # ── Client ──
    path('client/group-workouts/', ClientGroupWorkoutListView.as_view(), name='client-gw-list'),
    path('client/sessions/', ClientGroupSessionListView.as_view(), name='client-gw-sessions'),
    path('client/sessions/<int:session_id>/join/', ClientJoinSessionView.as_view(), name='client-gw-join'),
    path('client/sessions/<int:session_id>/leave/', ClientLeaveSessionView.as_view(), name='client-gw-leave'),
    path('client/my-sessions/', ClientMySessionsView.as_view(), name='client-gw-my-sessions'),

    # ── Admin ──
    path('admin/group-workouts/', AdminGroupWorkoutListView.as_view(), name='admin-gw-list'),
    path('admin/session-reports/', AdminSessionReportView.as_view(), name='admin-gw-reports'),
]
