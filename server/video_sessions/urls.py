from django.urls import path
from .views import (
    VideoSessionInitView,
    VideoSessionJoinView,
    VideoSessionStartView,
    VideoSessionEndView,
    VideoSessionDetailView,
    AdminVideoSessionLogsView,
    AdminVideoSessionAnalyticsView
)

urlpatterns = [
    path('init/', VideoSessionInitView.as_view(), name='video-session-init'),
    path('<int:pk>/join/', VideoSessionJoinView.as_view(), name='video-session-join'),
    path('<int:pk>/start/', VideoSessionStartView.as_view(), name='video-session-start'),
    path('<int:pk>/end/', VideoSessionEndView.as_view(), name='video-session-end'),
    path('<int:pk>/', VideoSessionDetailView.as_view(), name='video-session-detail'),
    
    path('admin/logs/', AdminVideoSessionLogsView.as_view(), name='video-session-admin-logs'),
    path('admin/analytics/', AdminVideoSessionAnalyticsView.as_view(), name='video-session-admin-analytics'),
]
