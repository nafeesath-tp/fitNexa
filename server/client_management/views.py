from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .permissions import IsAdmin, IsTrainer
from .serializers import AssignTrainerSerializer
from .services import (
    get_admin_client_assignments,
    assign_trainer_to_client,
    reassign_trainer,
    get_trainer_assigned_clients,
    get_trainer_client_detail,
)


class AdminClientAssignmentListAPIView(APIView):
    """
    GET /api/client-management/admin/assignments/
    List all clients with subscription tier and assigned trainer status.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        data = get_admin_client_assignments(request.query_params)
        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)


class AdminAssignTrainerAPIView(APIView):
    """
    POST /api/client-management/admin/assign/
    Assign a trainer to a client: { "client_id": 1, "trainer_id": 2 }
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        serializer = AssignTrainerSerializer(data=request.data)
        if serializer.is_valid():
            client = serializer.validated_data["client_id"]
            trainer = serializer.validated_data["trainer_id"]
            notes = serializer.validated_data.get("notes", "")
            
            assignment = assign_trainer_to_client(request.user, client, trainer, notes)
            return Response(
                {
                    "success": True, 
                    "message": f"Successfully assigned trainer {trainer.first_name or trainer.email} to {client.first_name or client.email}.",
                    "data": {"assignment_id": assignment.id}
                },
                status=status.HTTP_201_CREATED
            )
        return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class AdminReassignTrainerAPIView(APIView):
    """
    PATCH /api/client-management/admin/reassign/<int:client_id>/
    Reassign a client to a different trainer: { "trainer_id": 3 }
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, client_id):
        trainer_id = request.data.get("trainer_id")
        notes = request.data.get("notes", "")
        if not trainer_id:
            return Response({"success": False, "message": "trainer_id is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        assignment = reassign_trainer(request.user, client_id, trainer_id, notes)
        return Response(
            {
                "success": True,
                "message": f"Successfully reassigned client to new trainer.",
                "data": {"assignment_id": assignment.id}
            },
            status=status.HTTP_200_OK
        )


# ── Trainer Endpoints ────────────────────────────────────────────────────────

class TrainerAssignedClientListAPIView(APIView):
    """
    GET /api/client-management/trainer/my-clients/
    Returns grid of clients actively assigned to the logged-in trainer.
    """
    permission_classes = [IsAuthenticated, IsTrainer]

    def get(self, request):
        data = get_trainer_assigned_clients(request.user)
        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)


class TrainerAssignedClientDetailAPIView(APIView):
    """
    GET /api/client-management/trainer/my-clients/<int:client_id>/
    Returns deep-dive health profile and stats for an assigned client.
    """
    permission_classes = [IsAuthenticated, IsTrainer]

    def get(self, request, client_id):
        data = get_trainer_client_detail(request.user, client_id)
        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)
