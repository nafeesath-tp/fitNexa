from django.urls import path

from .views import SignupAPIView, VerifyOTPAPIView, LoginAPIView

urlpatterns = [
    path("signup/", SignupAPIView.as_view(), name="signup"),
    path("verify-otp/", VerifyOTPAPIView.as_view(), name="verify-otp"),
    path("login/", LoginAPIView.as_view(), name="login"),
]
