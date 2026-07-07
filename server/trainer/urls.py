from django.urls import path

from .views import TrainerOnboardingAPIView, TrainerProfileAPIView

urlpatterns = [
    path("onboarding/", TrainerOnboardingAPIView.as_view(), name="trainer-onboarding"),
    path("profile/", TrainerProfileAPIView.as_view(), name="trainer-profile"),
]
