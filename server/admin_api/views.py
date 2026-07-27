


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
    List all trainers with their profiles.
    Returns { success, data: [...] } for consistency with all other endpoints.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        profiles = TrainerProfile.objects.select_related('user', 'specialization').order_by('-created_at')
        serializer = AdminTrainerProfileSerializer(profiles, many=True, context={'request': request})
        return Response(
            {
                "success": True,
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

class AdminTrainerDetailAPIView(generics.RetrieveAPIView):
    """
    GET /api/admin/trainers/<id>/
    Retrieve a specific trainer profile.
    Returns { success, data: {...} } for consistency.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, id):
        try:
            profile = TrainerProfile.objects.select_related('user', 'specialization').get(id=id)
        except TrainerProfile.DoesNotExist:
            return Response(
                {"success": False, "message": "Trainer profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = AdminTrainerProfileSerializer(profile, context={'request': request})
        return Response(
            {
                "success": True,
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

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

    def destroy(self, request, *args, **kwargs):
        """
        Override destroy to provide better error messages when deletion fails.
        """
        instance = self.get_object()
        
        # Check if any trainers are using this specialization
        trainer_count = instance.trainers.count()
        
        if trainer_count > 0:
            return Response(
                {
                    "success": False,
                    "message": f"Cannot delete this specialization. It is currently being used by {trainer_count} trainer(s). Please reassign the trainers before deleting."
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # If no trainers are using it, proceed with deletion
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "message": "Specialization deleted successfully."
            },
            status=status.HTTP_200_OK
        )

from .serializers import AdminClientListSerializer, AdminClientDetailSerializer
from .services import list_clients, get_client_detail

class AdminClientListAPIView(APIView):
    """
    GET /api/admin/clients/
    List all clients.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        clients = list_clients()
        serializer = AdminClientListSerializer(clients, many=True)
        return Response(
            {
                "success": True,
                "data": serializer.data
            },
            status=status.HTTP_200_OK
        )

class AdminClientDetailAPIView(APIView):
    """
    GET /api/admin/clients/<id>/
    Retrieve a specific client profile with BMI dynamically calculated.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, id):
        try:
            result = get_client_detail(id)
        except Exception as e:
            return Response(
                {"success": False, "message": str(e)},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = AdminClientDetailSerializer(result["profile"])
        data = serializer.data
        data["bmi"] = result["bmi"]
        data["bmi_category"] = result["bmi_category"]

        return Response(
            {
                "success": True,
                "data": data
            },
            status=status.HTTP_200_OK
        )

from .serializers import AdminClientStatusUpdateSerializer
from client.models import ClientProfile

class AdminClientStatusAPIView(APIView):
    """
    PATCH /api/admin/clients/<id>/status/
    Block or unblock a client.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, id):
        try:
            profile = ClientProfile.objects.get(id=id)
        except ClientProfile.DoesNotExist:
            return Response(
                {"success": False, "message": "Client profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = AdminClientStatusUpdateSerializer(data=request.data)
        if serializer.is_valid():
            is_active = serializer.validated_data.get('is_active')
            
            user = profile.user
            if user.is_active == is_active:
                state = "active" if is_active else "blocked"
                return Response(
                    {"success": False, "message": f"Client is already {state}."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user.is_active = is_active
            user.save()
            
            state = "unblocked" if is_active else "blocked"
            return Response(
                {"success": True, "message": f"Client successfully {state}."},
                status=status.HTTP_200_OK
            )
            
        return Response(
            {"success": False, "message": "Invalid input.", "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )