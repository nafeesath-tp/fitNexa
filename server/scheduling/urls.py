from django.urls import path
from .views import (
    TrainerSettingsView,
    TrainerAvailabilityListCreateView,
    TrainerAvailabilityDetailView,
    BlockedDateListCreateView,
    BlockedDateDetailView,
    TrainerSlotListView,
    GenerateSlotsView,
    BlockSlotView,
    UnblockSlotView,
    ClientTrainerListView,
    ClientAvailableSlotsView,
    ClientBookSessionView,
    ClientSessionListView,
    ClientRescheduleSessionView,
    ClientCancelSessionView,
    TrainerSessionListView,
    TrainerCompleteSessionView
)

urlpatterns = [
    # Settings
    path('trainer/settings/', TrainerSettingsView.as_view(), name='trainer-settings'),
    
    # Availability
    path('trainer/availability/', TrainerAvailabilityListCreateView.as_view(), name='trainer-availability-list'),
    path('trainer/availability/<int:pk>/', TrainerAvailabilityDetailView.as_view(), name='trainer-availability-detail'),
    
    # Blocked Dates
    path('trainer/blocked-dates/', BlockedDateListCreateView.as_view(), name='trainer-blocked-dates-list'),
    path('trainer/blocked-dates/<int:pk>/', BlockedDateDetailView.as_view(), name='trainer-blocked-dates-detail'),
    
    # Slots
    path('trainer/slots/', TrainerSlotListView.as_view(), name='trainer-slots-list'),
    path('trainer/generate-slots/', GenerateSlotsView.as_view(), name='trainer-generate-slots'),
    path('trainer/slots/<int:pk>/block/', BlockSlotView.as_view(), name='trainer-slot-block'),
    path('trainer/slots/<int:pk>/unblock/', UnblockSlotView.as_view(), name='trainer-slot-unblock'),
    
    # ── Module 13 ──

    # Client Booking Endpoints
    path('client/trainers/', ClientTrainerListView.as_view(), name='client-trainers'),
    path('client/slots/', ClientAvailableSlotsView.as_view(), name='client-available-slots'),
    path('client/book/', ClientBookSessionView.as_view(), name='client-book-session'),
    path('client/sessions/', ClientSessionListView.as_view(), name='client-sessions-list'),
    path('client/sessions/<int:pk>/reschedule/', ClientRescheduleSessionView.as_view(), name='client-session-reschedule'),
    path('client/sessions/<int:pk>/cancel/', ClientCancelSessionView.as_view(), name='client-session-cancel'),

    # Trainer Session Endpoints
    path('trainer/sessions/', TrainerSessionListView.as_view(), name='trainer-sessions-list'),
    path('trainer/sessions/<int:pk>/complete/', TrainerCompleteSessionView.as_view(), name='trainer-session-complete'),
]
