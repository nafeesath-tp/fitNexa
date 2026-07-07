from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import ValidationError

from accounts.permissions import IsClient

from .serializers import (
    ClientProfileCreateSerializer,
    ClientProfileUpdateSerializer,
    ClientProfileSerializer,
)
from .services import create_client_profile, get_client_profile, update_client_profile


class ClientProfileCreateAPIView(APIView):
    """
    POST /api/client/profile/create/

    Create a new client profile.
    - Requires: authenticated user with role == CLIENT
    - Accepts: multipart/form-data (supports profile image upload)
    - first_name and last_name are required; all other fields are optional
    """

    permission_classes = [IsAuthenticated, IsClient]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = ClientProfileCreateSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "message": "Invalid input.",
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = create_client_profile(
                user=request.user,
                validated_data=serializer.validated_data,
            )
            profile_data = ClientProfileSerializer(result["profile"]).data

            return Response(
                {
                    "success": True,
                    "message": "Client profile created successfully.",
                    "data": {
                        **profile_data,
                        "bmi": result["bmi"],
                        "bmi_category": result["bmi_category"],
                    },
                },
                status=status.HTTP_201_CREATED,
            )

        except ValidationError as e:
            return Response(
                {
                    "success": False,
                    "message": "Profile creation failed.",
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


class ClientProfileAPIView(APIView):
    """
    GET  /api/client/profile/   — Retrieve profile + live BMI
    PATCH /api/client/profile/  — Partial update (only supplied fields)

    Both require: authenticated user with role == CLIENT
    PATCH accepts: multipart/form-data (supports profile image update)
    """

    permission_classes = [IsAuthenticated, IsClient]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        try:
            result = get_client_profile(user=request.user)
            profile_data = ClientProfileSerializer(result["profile"]).data

            return Response(
                {
                    "success": True,
                    "message": "Client profile retrieved successfully.",
                    "data": {
                        **profile_data,
                        "bmi": result["bmi"],
                        "bmi_category": result["bmi_category"],
                    },
                },
                status=status.HTTP_200_OK,
            )

        except ValidationError as e:
            return Response(
                {
                    "success": False,
                    "message": "Profile not found.",
                    "errors": e.detail,
                },
                status=status.HTTP_404_NOT_FOUND,
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

    def patch(self, request):
        serializer = ClientProfileUpdateSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "message": "Invalid input.",
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = update_client_profile(
                user=request.user,
                validated_data=serializer.validated_data,
            )
            profile_data = ClientProfileSerializer(result["profile"]).data

            return Response(
                {
                    "success": True,
                    "message": "Client profile updated successfully.",
                    "data": {
                        **profile_data,
                        "bmi": result["bmi"],
                        "bmi_category": result["bmi_category"],
                    },
                },
                status=status.HTTP_200_OK,
            )

        except ValidationError as e:
            return Response(
                {
                    "success": False,
                    "message": "Profile update failed.",
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
