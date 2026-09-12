/**
 * ConversationList.jsx — Left sidebar showing all conversations.
 */
import React from 'react';
import { MessageSquare, User } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { formatDistanceToNow } from 'date-fns';

export default function ConversationList({ conversations, loading }) {
  const { activeConversationId, setActiveConversation } = useChatStore();

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white/10 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-white/10 rounded w-3/4" />
              <div className="h-2 bg-white/10 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-gray-400">
        <MessageSquare className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-sm">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto flex-1">
      {conversations.map(conv => {
        const isActive = conv.id === activeConversationId;
        const other = conv.other_user;
        const lastMsg = conv.last_message;

        return (
          <button
            key={conv.id}
            onClick={() => setActiveConversation(conv.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left border-b border-white/5 hover:bg-white/5 ${
              isActive ? 'bg-primary/10 border-l-2 border-l-primary' : ''
            }`}
          >
            {/* Avatar */}
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/60 to-violet-500/60 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm uppercase">
              {other?.name?.[0] || <User className="w-5 h-5" />}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold text-white truncate">
                  {other?.name || other?.email}
                </span>
                {lastMsg && (
                  <span className="text-[10px] text-gray-500 ml-1 flex-shrink-0">
                    {formatDistanceToNow(new Date(lastMsg.created_at), { addSuffix: true })}
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center mt-0.5">
                <p className="text-xs text-gray-400 truncate">
                  {lastMsg?.content || 'No messages yet'}
                </p>
                {conv.unread_count > 0 && (
                  <span className="ml-2 flex-shrink-0 bg-primary text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {conv.unread_count > 9 ? '9+' : conv.unread_count}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
