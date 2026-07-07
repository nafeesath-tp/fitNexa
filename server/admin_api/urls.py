from django.urls import path
from .views import (
    AdminTrainerListAPIView, AdminTrainerDetailAPIView, AdminTrainerStatusAPIView,
    AdminSpecializationListCreateAPIView, AdminSpecializationRetrieveUpdateDestroyAPIView
)

urlpatterns = [
    # Trainer Management
    path('trainers/', AdminTrainerListAPIView.as_view(), name='admin-trainer-list'),
    path('trainers/<int:id>/', AdminTrainerDetailAPIView.as_view(), name='admin-trainer-detail'),
    path('trainers/<int:id>/status/', AdminTrainerStatusAPIView.as_view(), name='admin-trainer-status'),

    # Specialization CRUD
    path('specializations/', AdminSpecializationListCreateAPIView.as_view(), name='admin-specialization-list-create'),
    path('specializations/<int:id>/', AdminSpecializationRetrieveUpdateDestroyAPIView.as_view(), name='admin-specialization-detail'),
]
