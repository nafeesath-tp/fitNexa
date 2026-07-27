from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .permissions import IsAdmin, IsClient
from .services import (
    get_client_videos,
    get_client_video_detail,
    get_admin_videos,
    get_admin_video_detail,
    create_training_video,
    update_training_video,
    delete_training_video,
)


class ClientVideoListAPIView(APIView):
    """
    GET /api/content/client/videos/?specialization=X&difficulty=Y&access_level=Z&search=W
    Returns published videos with lock status tailored to client's subscription tier.
    """
    permission_classes = [IsAuthenticated, IsClient]

    def get(self, request):
        data = get_client_videos(request.user, request.query_params)
        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)


class ClientVideoDetailAPIView(APIView):
    """
    GET /api/content/client/videos/<video_id>/
    Returns detail for a single video. If locked, stream URL is obscured.
    """
    permission_classes = [IsAuthenticated, IsClient]

    def get(self, request, video_id):
        data = get_client_video_detail(request.user, video_id)
        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)


class AdminVideoListCreateAPIView(APIView):
    """
    GET /api/content/admin/videos/ — List all videos (with multi-param filtering)
    POST /api/content/admin/videos/ — Create new video in library
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        data = get_admin_videos(request.query_params)
        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)

    def post(self, request):
        data = create_training_video(request.user, request.data)
        return Response(
            {"success": True, "message": "Training video added successfully.", "data": data}, 
            status=status.HTTP_201_CREATED
        )


class AdminVideoDetailAPIView(APIView):
    """
    GET /api/content/admin/videos/<video_id>/ — View details
    PATCH /api/content/admin/videos/<video_id>/ — Edit metadata / publish toggle
    DELETE /api/content/admin/videos/<video_id>/ — Delete video
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, video_id):
        data = get_admin_video_detail(video_id)
        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)

    def patch(self, request, video_id):
        data = update_training_video(video_id, request.data)
        return Response(
            {"success": True, "message": "Training video updated successfully.", "data": data}, 
            status=status.HTTP_200_OK
        )

    def delete(self, request, video_id):
        delete_training_video(video_id)
        return Response(
            {"success": True, "message": "Training video deleted successfully."}, 
            status=status.HTTP_200_OK
        )
