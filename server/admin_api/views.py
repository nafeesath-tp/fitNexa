from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from accounts.models import TrainerProfile, Specialization
from accounts.permissions import IsAdmin
from .serializers import AdminTrainerProfileSerializer, AdminTrainerStatusUpdateSerializer, AdminSpecializationSerializer

class AdminTrainerListAPIView(generics.ListAPIView):
    """
    GET /api/admin/trainers/
    List all trainers.
    """
    queryset = TrainerProfile.objects.all().order_by('-created_at')
    serializer_class = AdminTrainerProfileSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

class AdminTrainerDetailAPIView(generics.RetrieveAPIView):
    """
    GET /api/admin/trainers/<id>/
    Retrieve a specific trainer profile.
    """
    queryset = TrainerProfile.objects.all()
    serializer_class = AdminTrainerProfileSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    lookup_field = 'id'

class AdminTrainerStatusAPIView(APIView):
    """
    PATCH /api/admin/trainers/<id>/status/
    Update the approval status of a trainer.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, id):
        try:
            profile = TrainerProfile.objects.get(id=id)
        except TrainerProfile.DoesNotExist:
            return Response(
                {"success": False, "message": "Trainer profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = AdminTrainerStatusUpdateSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            new_status = serializer.validated_data.get('approval_status')
            
            # State transition validation
            if profile.approval_status == new_status:
                return Response(
                    {
                        "success": False,
                        "message": f"Trainer is already {new_status}."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            serializer.save()
            return Response(
                {
                    "success": True,
                    "message": f"Trainer status updated to {new_status}.",
                    "data": serializer.data
                },
                status=status.HTTP_200_OK
            )
            
        return Response(
            {
                "success": False,
                "message": "Invalid input.",
                "errors": serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )

class AdminSpecializationListCreateAPIView(generics.ListCreateAPIView):
    """
    GET /api/admin/specializations/
    POST /api/admin/specializations/
    List all specializations or create a new one.
    """
    queryset = Specialization.objects.all()
    serializer_class = AdminSpecializationSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

class AdminSpecializationRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/admin/specializations/<id>/
    PUT /api/admin/specializations/<id>/
    PATCH /api/admin/specializations/<id>/
    DELETE /api/admin/specializations/<id>/
    Retrieve, update, or delete a specific specialization.
    """
    queryset = Specialization.objects.all()
    serializer_class = AdminSpecializationSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    lookup_field = 'id'
