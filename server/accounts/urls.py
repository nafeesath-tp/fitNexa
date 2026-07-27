from django.urls import path

from .views import (
    SignupAPIView, VerifyOTPAPIView, ResendOTPAPIView, LoginAPIView, LogoutAPIView,
    ForgotPasswordAPIView, VerifyResetOTPAPIView, ResetPasswordAPIView,
    MeAPIView, GoogleAuthAPIView, GoogleSignupAPIView, TokenRefreshAPIView,
)

urlpatterns = [
    path("signup/", SignupAPIView.as_view(), name="signup"),
    path("verify-otp/", VerifyOTPAPIView.as_view(), name="verify-otp"),
    path("resend-otp/", ResendOTPAPIView.as_view(), name="resend-otp"),
    path("login/", LoginAPIView.as_view(), name="login"),
    path("logout/", LogoutAPIView.as_view(), name="logout"),
    path("forgot-password/", ForgotPasswordAPIView.as_view(), name="forgot-password"),
    path("verify-reset-otp/", VerifyResetOTPAPIView.as_view(), name="verify-reset-otp"),
    path("reset-password/", ResetPasswordAPIView.as_view(), name="reset-password"),
    path("me/", MeAPIView.as_view(), name="me"),
    path("token/refresh/", TokenRefreshAPIView.as_view(), name="token-refresh"),
    path("google-auth/", GoogleAuthAPIView.as_view(), name="google-auth"),
    path("google-signup/", GoogleSignupAPIView.as_view(), name="google-signup"),
]
