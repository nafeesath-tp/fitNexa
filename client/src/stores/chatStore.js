/**
 * chatStore.js — Zustand store for chat state and WebSocket management.
 */
import { create } from 'zustand';

const WS_BASE = import.meta.env.VITE_WS_BASE || 'ws://127.0.0.1:8000';

export const useChatStore = create((set, get) => ({
  // State
  conversations: [],
  activeConversationId: null,
  messages: [],
  unreadCount: 0,
  typingUserId: null,
  typingTimeout: null,
  ws: null,
  wsConnected: false,
  wsError: null,

  // ── Conversation Actions ──────────────────────────────────────────────────

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (id) => {
    const { activeConversationId, disconnectWs, connectWs } = get();
    if (activeConversationId === id) return;
    disconnectWs();
    set({ activeConversationId: id, messages: [], typingUserId: null });
    if (id) connectWs(id);
  },

  // ── Message Actions ───────────────────────────────────────────────────────

  setMessages: (messages) => set({ messages }),

  appendMessage: (msg) => {
    set(state => ({
      messages: [...state.messages, msg],
    }));
    // Update conversation last message preview
    set(state => ({
      conversations: state.conversations.map(c =>
        c.id === get().activeConversationId
          ? {
              ...c,
              last_message: {
                content: msg.content || (msg.file_name ? `📎 ${msg.file_name}` : ''),
                created_at: msg.created_at,
                sender_id: msg.sender_id,
              },
              updated_at: msg.created_at,
            }
          : c
      ),
    }));
  },

  // ── Typing ────────────────────────────────────────────────────────────────

  setTyping: (userId) => {
    const { typingTimeout } = get();
    if (typingTimeout) clearTimeout(typingTimeout);
    const timeout = setTimeout(() => set({ typingUserId: null, typingTimeout: null }), 3000);
    set({ typingUserId: userId, typingTimeout: timeout });
  },

  // ── WebSocket ─────────────────────────────────────────────────────────────

  connectWs: (conversationId) => {
    const { ws } = get();
    if (ws) {
      ws.close();
    }

    const socket = new WebSocket(`${WS_BASE}/ws/chat/${conversationId}/`);

    socket.onopen = () => {
      set({ wsConnected: true, wsError: null });
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const { appendMessage, setTyping } = get();

      if (data.type === 'chat.message') {
        appendMessage({
          id: data.id,
          sender_id: data.sender_id,
          content: data.content,
          file_url: data.file_url || null,
          file_name: data.file_name || '',
          created_at: data.created_at,
          is_read: false,
        });
      } else if (data.type === 'chat.typing') {
        setTyping(data.sender_id);
      } else if (data.type === 'chat.read') {
        // Mark all messages from the reader as read in local state
        set(state => ({
          messages: state.messages.map(m =>
            m.sender_id !== data.reader_id ? { ...m, is_read: true } : m
          ),
        }));
      }
    };

    socket.onerror = () => {
      set({ wsError: 'Connection error. Try again.', wsConnected: false });
    };

    socket.onclose = (e) => {
      set({ wsConnected: false, ws: null });
    };

    set({ ws: socket });
  },

  disconnectWs: () => {
    const { ws } = get();
    if (ws) {
      ws.close();
      set({ ws: null, wsConnected: false });
    }
  },

  sendWsMessage: (content) => {
    const { ws, wsConnected } = get();
    if (!ws || !wsConnected) return false;
    ws.send(JSON.stringify({ type: 'chat.message', content }));
    return true;
  },

  sendTyping: () => {
    const { ws, wsConnected } = get();
    if (ws && wsConnected) {
      ws.send(JSON.stringify({ type: 'chat.typing' }));
    }
  },

  sendRead: () => {
    const { ws, wsConnected } = get();
    if (ws && wsConnected) {
      ws.send(JSON.stringify({ type: 'chat.read' }));
    }
  },

  /** Notify WebSocket peers that a file message was sent via REST */
  notifyFileSent: (message) => {
    const { ws, wsConnected } = get();
    if (ws && wsConnected) {
      ws.send(JSON.stringify({
        type: 'chat.file_sent',
        id: message.id,
        content: message.content || '',
        created_at: message.created_at,
        file_url: message.file_url || null,
        file_name: message.file_name || '',
      }));
    }
  },

  markConversationRead: (conversationId) => {
    set(state => ({
      conversations: state.conversations.map(c =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      ),
    }));
  },
}));
