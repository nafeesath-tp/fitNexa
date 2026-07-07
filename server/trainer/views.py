from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import ValidationError

from accounts.models import TrainerProfile
from accounts.permissions import IsTrainer

from .serializers import TrainerOnboardingSerializer, TrainerProfileSerializer
from .services import submit_trainer_onboarding


class TrainerOnboardingAPIView(APIView):
    """
    POST /api/trainer/onboarding/
    Submit trainer onboarding profile for admin approval.
    Requires: authenticated user with role == TRAINER
    Accepts: multipart/form-data (supports file uploads)
    """

    permission_classes = [IsAuthenticated, IsTrainer]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = TrainerOnboardingSerializer(data=request.data)

        if serializer.is_valid():
            try:
                profile = submit_trainer_onboarding(
                    user=request.user,
                    validated_data=serializer.validated_data,
                )
                return Response(
                    {
                        "success": True,
                        "message": "Trainer onboarding submitted successfully.",
                        "data": {
                            "approval_status": profile.approval_status,
                        },
                    },
                    status=status.HTTP_201_CREATED,
                )
            except ValidationError as e:
                return Response(
                    {
                        "success": False,
                        "message": "Onboarding submission failed.",
                        "errors": e.detail,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except Exception as e:
                import traceback
                traceback.print_exc()
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


class TrainerProfileAPIView(APIView):
    """
    GET /api/trainer/profile/
    Retrieve the authenticated trainer's profile and approval status.
    Requires: authenticated user with role == TRAINER
    """

    permission_classes = [IsAuthenticated, IsTrainer]

    def get(self, request):
        try:
            profile = request.user.trainer_profile
        except TrainerProfile.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "Onboarding profile not found. Please complete onboarding first.",
                    "data": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = TrainerProfileSerializer(profile)
        return Response(
            {
                "success": True,
                "message": "Trainer profile retrieved successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )
