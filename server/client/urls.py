from django.urls import path

from .views import ClientProfileCreateAPIView, ClientProfileAPIView

urlpatterns = [
    # POST /api/client/profile/create/ — Create profile (first time only)
    path("profile/create/", ClientProfileCreateAPIView.as_view(), name="client-profile-create"),

    # GET  /api/client/profile/        — Retrieve profile + live BMI
    # PATCH /api/client/profile/       — Partial update (only supplied fields)
    path("profile/", ClientProfileAPIView.as_view(), name="client-profile"),
]
