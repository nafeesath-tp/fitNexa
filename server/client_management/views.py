from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsAdmin, IsTrainer, IsClient
from accounts.models import User
from .serializers import AssignTrainerSerializer
from .services import (
    get_admin_client_assignments,
    assign_trainer_to_client,
    reassign_trainer,
    get_trainer_assigned_clients,
    get_trainer_client_detail,
    get_client_assigned_trainer,
    create_trainer_group, get_trainer_groups, get_trainer_group_detail,
    update_trainer_group, delete_trainer_group,
    add_member_to_group, remove_member_from_group, get_group_eligible_clients,
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
            try:
                client = serializer.validated_data["client_id"]
                trainer = serializer.validated_data["trainer_id"]
                notes = serializer.validated_data.get("notes", "")
                assignment = assign_trainer_to_client(request.user, client, trainer, notes)
                
                t_name = getattr(trainer.trainer_profile, 'first_name', '') if hasattr(trainer, 'trainer_profile') else ''
                c_name = getattr(client.client_profile, 'first_name', '') if hasattr(client, 'client_profile') else ''
                
                return Response(
                    {
                        "success": True, 
                        "message": f"Successfully assigned trainer {t_name or trainer.email} to {c_name or client.email}.",
                        "data": {"assignment_id": assignment.id}
                    },
                    status=status.HTTP_201_CREATED
                )
            except Exception as e:
                import traceback
                traceback.print_exc()
                return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        print("ASSIGN TRAINER VALIDATION ERRORS:", serializer.errors)
        return Response({"success": False, "errors": serializer.errors, "message": "Validation failed"}, status=status.HTTP_400_BAD_REQUEST)


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

class AdminUpdateSessionCreditsAPIView(APIView):
    """
    PATCH /api/client-management/admin/credits/<int:client_id>/
    Update the session_credits for a client: { "session_credits": 10 }
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, client_id):
        credits = request.data.get("session_credits")
        if credits is None:
            return Response({"success": False, "message": "session_credits is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            client_user = User.objects.get(id=client_id, role=User.Role.CLIENT)
            profile = client_user.client_profile
            profile.session_credits = int(credits)
            profile.save(update_fields=['session_credits'])
            return Response({
                "success": True, 
                "message": f"Successfully updated session credits to {credits} for {client_user.email}."
            })
        except User.DoesNotExist:
            return Response({"success": False, "message": "Client not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)


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


# ── Client Endpoints ────────────────────────────────────────────────────────

class ClientAssignedTrainerAPIView(APIView):
    """
    GET /api/client-management/client/trainer/
    Returns the trainer currently assigned to the authenticated client.
    Used by the Client Dashboard — no admin permissions required.
    """
    permission_classes = [IsAuthenticated, IsClient]

    def get(self, request):
        data = get_client_assigned_trainer(request.user)
        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)


# ── Trainer: Group Management ───────────────────────────────────────────────

from accounts.permissions import IsApprovedTrainer
from workout_plans.services import assign_workout_to_group
from diet_plans.services import assign_diet_to_group


class TrainerGroupListCreateAPIView(APIView):
    """
    GET  /api/client-management/trainer/groups/   — list my groups
    POST /api/client-management/trainer/groups/   — create a new group
    """
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def get(self, request):
        data = get_trainer_groups(request.user)
        return Response({"success": True, "data": data})

    def post(self, request):
        data = create_trainer_group(request.user, request.data)
        return Response({"success": True, "data": data}, status=status.HTTP_201_CREATED)


class TrainerGroupDetailAPIView(APIView):
    """
    GET    /api/client-management/trainer/groups/<group_id>/  — full detail + members
    PATCH  /api/client-management/trainer/groups/<group_id>/  — update name/size
    DELETE /api/client-management/trainer/groups/<group_id>/  — soft-delete
    """
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def get(self, request, group_id):
        data = get_trainer_group_detail(request.user, group_id)
        return Response({"success": True, "data": data})

    def patch(self, request, group_id):
        data = update_trainer_group(request.user, group_id, request.data)
        return Response({"success": True, "data": data})

    def delete(self, request, group_id):
        delete_trainer_group(request.user, group_id)
        return Response({"success": True, "message": "Group deactivated."})


class TrainerGroupMemberAPIView(APIView):
    """
    POST   /api/client-management/trainer/groups/<group_id>/members/
           Body: { "trainer_assignment_id": 5 }   — add a client to the group

    DELETE /api/client-management/trainer/groups/<group_id>/members/<ta_id>/
           — remove a client from the group
    """
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def post(self, request, group_id):
        ta_id = request.data.get("trainer_assignment_id")
        if not ta_id:
            return Response(
                {"success": False, "message": "trainer_assignment_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = add_member_to_group(request.user, group_id, ta_id)
        return Response({"success": True, "data": data}, status=status.HTTP_201_CREATED)


class TrainerGroupMemberRemoveAPIView(APIView):
    """
    DELETE /api/client-management/trainer/groups/<group_id>/members/<ta_id>/
    """
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def delete(self, request, group_id, ta_id):
        remove_member_from_group(request.user, group_id, ta_id)
        return Response({"success": True, "message": "Member removed from group."})


class TrainerGroupEligibleClientsAPIView(APIView):
    """
    GET /api/client-management/trainer/groups/<group_id>/eligible-clients/
    Returns GROUP-plan clients assigned to this trainer who are not yet in any group.
    """
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def get(self, request, group_id):
        data = get_group_eligible_clients(request.user, group_id)
        return Response({"success": True, "data": data})


class TrainerGroupAssignWorkoutAPIView(APIView):
    """
    POST /api/client-management/trainer/groups/<group_id>/assign-workout/
    Body: { "plan_id": 3 }
    Assigns a workout plan to the entire group. All members will see this plan.
    """
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def post(self, request, group_id):
        plan_id = request.data.get("plan_id")
        if not plan_id:
            return Response(
                {"success": False, "message": "plan_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = assign_workout_to_group(request.user, plan_id, group_id)
        return Response({"success": True, "data": data}, status=status.HTTP_201_CREATED)


class TrainerGroupAssignDietAPIView(APIView):
    """
    POST /api/client-management/trainer/groups/<group_id>/assign-diet/
    Body: { "plan_id": 5 }
    Assigns a diet plan to the entire group. All members will see this plan.
    """
    permission_classes = [IsAuthenticated, IsApprovedTrainer]

    def post(self, request, group_id):
        plan_id = request.data.get("plan_id")
        if not plan_id:
            return Response(
                {"success": False, "message": "plan_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = assign_diet_to_group(request.user, plan_id, group_id)
        return Response({"success": True, "data": data}, status=status.HTTP_201_CREATED)
