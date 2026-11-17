/**
 * chatApi.js — REST API service for Chat.
 * WebSocket is handled separately via chatStore.
 */
import api from '../api/axios';

export const chatApi = {
  /** Get a token for authenticating the WebSocket handshake */
  getWsToken: () =>
    api.get('/api/chat/ws-token/').then(r => r.data).catch(() => null),

  /** Get all conversations for the logged-in user */
  getConversations: () =>
    api.get('/api/chat/conversations/').then(r => r.data),

  /** Client: get or create a conversation with their assigned trainer */
  getOrCreateConversation: (trainerId) =>
    api.post('/api/chat/conversations/', { trainer_id: trainerId }).then(r => r.data),

  /** Trainer: get or create a conversation with their assigned client */
  startChatWithClient: (clientId) =>
    api.post('/api/chat/conversations/', { client_id: clientId }).then(r => r.data),

  /** Get conversation detail */
  getConversationDetail: (conversationId) =>
    api.get(`/api/chat/conversations/${conversationId}/`).then(r => r.data),

  /** Get paginated messages for a conversation */
  getMessages: (conversationId, page = 1, pageSize = 30) =>
    api.get(`/api/chat/conversations/${conversationId}/messages/`, {
      params: { page, page_size: pageSize }
    }).then(r => r.data),

  /**
   * Send a message (text + optional file).
   * @param {number} conversationId
   * @param {string} content - text content (can be empty if file is provided)
   * @param {File|null} file - optional file attachment
   */
  sendMessage: (conversationId, content, file = null) => {
    const formData = new FormData();
    if (content) formData.append('content', content);
    if (file) {
      formData.append('file', file);
    }
    return api.post(`/api/chat/conversations/${conversationId}/messages/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  /** Report a message */
  reportMessage: (messageId, reason) =>
    api.post(`/api/chat/messages/${messageId}/report/`, { reason }).then(r => r.data),

  /** Admin: list reports */
  getAdminReports: (statusFilter = '') =>
    api.get('/api/chat/admin/reports/', {
      params: statusFilter ? { status: statusFilter } : {}
    }).then(r => r.data),

  /** Admin: review or dismiss a report */
  reviewReport: (reportId, newStatus) =>
    api.post(`/api/chat/admin/reports/${reportId}/review/`, { status: newStatus }).then(r => r.data),
};
