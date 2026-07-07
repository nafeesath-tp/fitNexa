from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import ValidationError

from .serializers import (
    SignupSerializer, VerifyOTPSerializer, LoginSerializer,
    ForgotPasswordSerializer, VerifyResetOTPSerializer, ResetPasswordSerializer,
)
from .services import signup_user, verify_otp, login_user, forgot_password, verify_reset_otp, reset_password


class SignupAPIView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        serializer = SignupSerializer(data=request.data)

        if serializer.is_valid():
            try:
                signup_user(serializer.validated_data)
                return Response(
                    {
                        "success": True,
                        "message": "OTP sent successfully. Please verify your email.",
                        "data": {},
                    },
                    status=status.HTTP_201_CREATED,
                )
            except ValidationError as e:
                return Response(
                    {
                        "success": False,
                        "message": "Signup failed.",
                        "errors": e.detail,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except Exception:
                return Response(
                    {
                        "success": False,
                        "message": "Something went wrong. Please try again later.",
                        "errors": {},
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

        return Response(
            {
                "success": False,
                "message": "Signup failed.",
                "errors": serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )


class VerifyOTPAPIView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)

        if serializer.is_valid():
            try:
                verify_otp(serializer.validated_data)
                return Response(
                    {
                        "success": True,
                        "message": "Email verified successfully. You can now log in.",
                        "data": {},
                    },
                    status=status.HTTP_200_OK,
                )
            except ValidationError as e:
                return Response(
                    {
                        "success": False,
                        "message": "OTP verification failed.",
                        "errors": e.detail,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(
            {
                "success": False,
                "message": "Invalid input.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


class LoginAPIView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if serializer.is_valid():
            try:
                result = login_user(serializer.validated_data)
                user = result["user"]

                response_data = {
                    "email": user.email,
                    "role": user.role,
                }
                
                if user.role == "TRAINER":
                    if hasattr(user, 'trainer_profile'):
                        response_data["approval_status"] = user.trainer_profile.approval_status
                    else:
                        response_data["approval_status"] = "PENDING_ONBOARDING" # Or whatever makes sense if no profile yet

                response = Response(
                    {
                        "success": True,
                        "message": "Login successful.",
                        "data": response_data,
                    },
                    status=status.HTTP_200_OK,
                )

                # Store tokens in HttpOnly cookies — never exposed to JavaScript
                response.set_cookie(
                    key="access_token",
                    value=result["access"],
                    httponly=True,
                    samesite="Lax",
                    secure=False,       # Set True in production (HTTPS)
                    max_age=60 * 30,    # 30 minutes
                )
                response.set_cookie(
                    key="refresh_token",
                    value=result["refresh"],
                    httponly=True,
                    samesite="Lax",
                    secure=False,              # Set True in production (HTTPS)
                    max_age=60 * 60 * 24 * 7,  # 7 days
                )

                return response

            except ValidationError as e:
                return Response(
                    {
                        "success": False,
                        "message": "Login failed.",
                        "errors": e.detail,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except Exception:
                return Response(
                    {
                        "success": False,
                        "message": "Something went wrong. Please try again later.",
                        "errors": {},
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

        return Response(
            {
                "success": False,
                "message": "Login failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


class LogoutAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):
        response = Response(
            {
                "success": True,
                "message": "Logged out successfully.",
                "data": {},
            },
            status=status.HTTP_200_OK,
        )

        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")

        return response


class ForgotPasswordAPIView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)

        if serializer.is_valid():
            try:
                forgot_password(serializer.validated_data)
            except Exception:
                pass  # Silent — never reveal if email exists or if sending failed

            # Always return success to prevent user enumeration
            return Response(
                {
                    "success": True,
                    "message": "If this email is registered, a password reset OTP has been sent.",
                    "data": {},
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                "success": False,
                "message": "Invalid input.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


class VerifyResetOTPAPIView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyResetOTPSerializer(data=request.data)

        if serializer.is_valid():
            try:
                verify_reset_otp(serializer.validated_data)
                return Response(
                    {
                        "success": True,
                        "message": "OTP verified successfully. You may now reset your password.",
                        "data": {},
                    },
                    status=status.HTTP_200_OK,
                )
            except ValidationError as e:
                return Response(
                    {
                        "success": False,
                        "message": "OTP verification failed.",
                        "errors": e.detail,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(
            {
                "success": False,
                "message": "Invalid input.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


class ResetPasswordAPIView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):
        # OTP is passed alongside new password for atomic verification + reset
        data = request.data.copy()
        serializer = ResetPasswordSerializer(data=data)

        if serializer.is_valid():
            try:
                # Merge OTP from request into validated_data for the service
                validated = serializer.validated_data.copy()
                validated["otp"] = request.data.get("otp", "")

                reset_password(validated)
                return Response(
                    {
                        "success": True,
                        "message": "Password reset successfully. You can now log in.",
                        "data": {},
                    },
                    status=status.HTTP_200_OK,
                )
            except ValidationError as e:
                return Response(
                    {
                        "success": False,
                        "message": "Password reset failed.",
                        "errors": e.detail,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except Exception:
                return Response(
                    {
                        "success": False,
                        "message": "Something went wrong. Please try again later.",
                        "errors": {},
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

        return Response(
            {
                "success": False,
                "message": "Invalid input.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
