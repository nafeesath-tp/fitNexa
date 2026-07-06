from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import ValidationError

from .serializers import SignupSerializer, VerifyOTPSerializer
from .services import signup_user, verify_otp


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
