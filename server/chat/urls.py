"""chat/urls.py — REST URL patterns for chat."""
from django.urls import path
from .views import (
    ConversationListCreateView,
    ConversationDetailView,
    MessageListCreateView,
    WebSocketTokenView,
    ReportMessageView,
    AdminChatReportListView,
    AdminReviewReportView,
)

urlpatterns = [
    # WebSocket Auth Token
    path('ws-token/', WebSocketTokenView.as_view(), name='chat-ws-token'),

    # Conversations
    path('conversations/', ConversationListCreateView.as_view(), name='chat-conversations'),
    path('conversations/<int:pk>/', ConversationDetailView.as_view(), name='chat-conversation-detail'),

    # Messages
    path('conversations/<int:pk>/messages/', MessageListCreateView.as_view(), name='chat-messages'),

    # Reports
    path('messages/<int:pk>/report/', ReportMessageView.as_view(), name='chat-report-message'),

    # Admin
    path('admin/reports/', AdminChatReportListView.as_view(), name='chat-admin-reports'),
    path('admin/reports/<int:pk>/review/', AdminReviewReportView.as_view(), name='chat-admin-review'),
]
