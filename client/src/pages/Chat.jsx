/**
 * Chat.jsx — Main chat page for Clients and Trainers.
 *
 * Layout:
 *   ┌──────────────────────────────────────────┐
 *   │ Conversations │      Chat Window          │
 *   │ ─────────── │  ─────────────────────── │
 *   │ Sarah  2     │  [Messages]               │
 *   │ John   0     │                           │
 *   │              │  [  Type here... ] [Send] │
 *   └──────────────────────────────────────────┘
 */
import React, { useEffect, useState } from 'react';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { chatApi } from '../services/chatApi';
import { authApi } from '../services/auth/authApi';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import toast from 'react-hot-toast';

export default function Chat() {
  const { user, role } = useAuthStore();
  const {
    conversations, setConversations,
    activeConversationId, setActiveConversation,
    disconnectWs,
  } = useChatStore();

  const [loading, setLoading] = useState(true);

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  const loadConversations = async () => {
    setLoading(true);
    try {
      const data = await chatApi.getConversations();
      setConversations(data);
      // Auto-select first conversation
      if (data.length > 0 && !activeConversationId) {
        setActiveConversation(data[0].id);
      }
    } catch {
      toast.error('Failed to load conversations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      authApi.checkAuth().then(res => {
        if (res.success) {
          useAuthStore.getState().setAuth(res.data);
        }
      }).catch(() => {});
    }
    loadConversations();
    return () => disconnectWs(); // Cleanup WS on unmount
  }, []);

  return (
    <div className="flex h-[calc(100vh-80px)] bg-gray-950 rounded-xl overflow-hidden border border-white/10 shadow-2xl">

      {/* ── Left: Conversations Sidebar ─────────────── */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-white/10 bg-gray-900/50">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-white">Messages</h2>
          </div>
          <button
            onClick={loadConversations}
            className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Conversation List */}
        <ConversationList conversations={conversations} loading={loading} />
      </div>

      {/* ── Right: Chat Window ───────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatWindow conversation={activeConversation} />
      </div>
    </div>
  );
}
