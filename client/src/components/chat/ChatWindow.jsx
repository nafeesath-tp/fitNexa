/**
 * ChatWindow.jsx — Right panel showing the active conversation messages.
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { User, WifiOff } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { chatApi } from '../../services/chatApi';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

export default function ChatWindow({ conversation }) {
  const bottomRef = useRef(null);
  const { user } = useAuthStore();
  const {
    messages, setMessages,
    typingUserId, wsConnected, wsConnecting,
    connectWs, sendRead, markConversationRead,
  } = useChatStore();

  const otherUser = conversation?.other_user;
  const conversationId = conversation?.id;

  // Load message history & ensure WebSocket is connected when conversation changes
  useEffect(() => {
    if (!conversationId) return;

    connectWs(conversationId);

    chatApi.getMessages(conversationId).then(data => {
      setMessages(data.results || []);
      // Mark as read
      sendRead();
      markConversationRead(conversationId);
    }).catch(console.error);
  }, [conversationId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark read when window is focused
  useEffect(() => {
    const onFocus = () => {
      if (conversationId) {
        sendRead();
        markConversationRead(conversationId);
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [conversationId]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-500">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <User className="w-10 h-10 opacity-30" />
        </div>
        <h3 className="text-lg font-semibold text-white/40 mb-2">Select a conversation</h3>
        <p className="text-sm">Choose a chat from the left to start messaging.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/10 bg-gray-900/60 backdrop-blur">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/60 to-violet-500/60 flex items-center justify-center text-white font-bold text-sm uppercase">
          {otherUser?.name?.[0] || '?'}
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">{otherUser?.name || otherUser?.email}</h3>
          <p className="text-[11px] text-gray-500 capitalize">{otherUser?.role?.toLowerCase()}</p>
        </div>
        {/* Connection indicator */}
        <div className="ml-auto flex items-center gap-2">
          {wsConnected ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-gray-400">Live</span>
            </span>
          ) : wsConnecting ? (
            <span className="flex items-center gap-1.5 text-xs text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-[11px] text-gray-400">Connecting...</span>
            </span>
          ) : (
            <button
              onClick={() => connectWs(conversationId)}
              className="flex items-center gap-1.5 text-[11px] text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 rounded-md border border-red-500/20 transition-colors"
              title="Click to reconnect"
            >
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline (Retry)</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
        {messages.length === 0 && (
          <p className="text-center text-gray-500 text-sm mt-8">
            No messages yet. Say hello! 👋
          </p>
        )}
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isMine={String(msg.sender_id) === String(user?.id)}
          />
        ))}

        {/* Typing indicator */}
        {typingUserId && typingUserId !== user?.id && (
          <div className="flex items-end gap-2 mb-2">
            <div className="bg-white/10 border border-white/10 rounded-2xl rounded-bl-none px-4 py-2.5">
              <div className="flex items-center gap-1">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput
        conversationId={conversationId}
        onMessageSent={scrollToBottom}
      />
    </div>
  );
}
