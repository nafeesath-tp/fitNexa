/**
 * chatStore.js — Zustand store for chat state and WebSocket management.
 */
import { create } from 'zustand';
import { chatApi } from '../services/chatApi';

const getWsBase = () => {
  if (import.meta.env.VITE_WS_BASE) {
    return import.meta.env.VITE_WS_BASE;
  }
  const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `${protocol}//${host}:8000`;
};

let reconnectTimer = null;
let reconnectAttempts = 0;
let isExplicitDisconnect = false;

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
  wsConnecting: false,
  wsError: null,

  // ── Conversation Actions ──────────────────────────────────────────────────

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (id) => {
    const { activeConversationId, ws, wsConnected, disconnectWs, connectWs } = get();
    if (activeConversationId === id) {
      // If already on this conversation but socket is not open, reconnect it
      if (!wsConnected || !ws || ws.readyState !== WebSocket.OPEN) {
        connectWs(id);
      }
      return;
    }

    disconnectWs();
    set({ activeConversationId: id, messages: [], typingUserId: null });
    if (id) {
      connectWs(id);
    }
  },

  // ── Message Actions ───────────────────────────────────────────────────────

  setMessages: (messages) => set({ messages }),

  appendMessage: (msg) => {
    if (!msg || !msg.id) return;

    set((state) => {
      // Prevent duplicates
      if (state.messages.some((m) => m.id === msg.id)) {
        return state;
      }

      return {
        messages: [...state.messages, msg],
      };
    });

    // Update conversation last message preview
    set((state) => ({
      conversations: state.conversations.map((c) =>
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

  connectWs: async (conversationId) => {
    if (!conversationId) return;

    isExplicitDisconnect = false;

    // Clear any pending reconnect
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    const { ws } = get();
    if (ws) {
      ws.onclose = null;
      ws.onerror = null;
      ws.close();
    }

    set({ wsConnecting: true, wsError: null });

    // Fetch token for bulletproof WebSocket authentication across all browsers/cookies
    let token = '';
    try {
      const res = await chatApi.getWsToken();
      if (res && res.token) {
        token = res.token;
      }
    } catch {
      // Fallback: will rely on HttpOnly cookie if getWsToken fails
    }

    const wsBase = getWsBase();
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
    const socketUrl = `${wsBase}/ws/chat/${conversationId}/${tokenQuery}`;

    try {
      const socket = new WebSocket(socketUrl);

      socket.onopen = () => {
        reconnectAttempts = 0;
        set({ wsConnected: true, wsConnecting: false, wsError: null });
      };

      socket.onmessage = (event) => {
        try {
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
            set((state) => ({
              messages: state.messages.map((m) =>
                m.sender_id !== data.reader_id ? { ...m, is_read: true } : m
              ),
            }));
          }
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err);
        }
      };

      socket.onerror = () => {
        set({ wsError: 'Connection error.', wsConnected: false, wsConnecting: false });
      };

      socket.onclose = (event) => {
        set({ wsConnected: false, wsConnecting: false, ws: null });

        // Auto-reconnect if closure was unexpected and conversation is still active
        const { activeConversationId, connectWs } = get();
        if (
          !isExplicitDisconnect &&
          activeConversationId === conversationId &&
          event.code !== 1000 &&
          reconnectAttempts < 6
        ) {
          const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 10000);
          reconnectAttempts += 1;
          reconnectTimer = setTimeout(() => {
            connectWs(conversationId);
          }, delay);
        }
      };

      set({ ws: socket });
    } catch (err) {
      console.error('[WebSocket] Failed to initialize socket:', err);
      set({ wsError: 'Failed to connect.', wsConnected: false, wsConnecting: false });
    }
  },

  disconnectWs: () => {
    isExplicitDisconnect = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    reconnectAttempts = 0;

    const { ws } = get();
    if (ws) {
      ws.onclose = null;
      ws.onerror = null;
      ws.close();
      set({ ws: null, wsConnected: false, wsConnecting: false });
    }
  },

  sendWsMessage: (content) => {
    const { ws, wsConnected } = get();
    if (!ws || !wsConnected || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify({ type: 'chat.message', content }));
    return true;
  },

  sendTyping: () => {
    const { ws, wsConnected } = get();
    if (ws && wsConnected && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'chat.typing' }));
    }
  },

  sendRead: () => {
    const { ws, wsConnected } = get();
    if (ws && wsConnected && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'chat.read' }));
    }
  },

  /** Notify WebSocket peers that a file message was sent via REST */
  notifyFileSent: (message) => {
    const { ws, wsConnected } = get();
    if (ws && wsConnected && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'chat.file_sent',
          id: message.id,
          content: message.content || '',
          created_at: message.created_at,
          file_url: message.file_url || null,
          file_name: message.file_name || '',
        })
      );
    }
  },

  markConversationRead: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      ),
    }));
  },
}));
