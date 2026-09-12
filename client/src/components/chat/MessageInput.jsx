/**
 * MessageInput.jsx — Text + file input bar at the bottom of the chat.
 */
import React, { useState, useRef } from 'react';
import { Send, Paperclip, X, Loader2 } from 'lucide-react';
import { chatApi } from '../../services/chatApi';
import { useChatStore } from '../../stores/chatStore';
import toast from 'react-hot-toast';

const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'docx', 'doc', 'txt', 'mp4', 'mov'];
const MAX_MB = 10;

export default function MessageInput({ conversationId, onMessageSent }) {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);
  const typingTimeout = useRef(null);

  const { sendWsMessage, sendTyping, notifyFileSent, appendMessage } = useChatStore();

  const handleTyping = (e) => {
    setText(e.target.value);
    // Send typing event at most once per second
    if (!typingTimeout.current) {
      sendTyping();
      typingTimeout.current = setTimeout(() => {
        typingTimeout.current = null;
      }, 1000);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      toast.error(`File type .${ext} is not allowed.`);
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`File must be under ${MAX_MB}MB.`);
      return;
    }
    setFile(f);
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !file) return;
    setSending(true);

    try {
      if (file) {
        // File must go through REST (not WebSocket)
        const message = await chatApi.sendMessage(conversationId, trimmed, file);
        // Append immediately to local state
        appendMessage({
          id: message.id,
          sender_id: message.sender_id,
          content: message.content,
          file_url: message.file_url,
          file_name: message.file_name,
          created_at: message.created_at,
          is_read: false,
        });
        // Notify the other user via WebSocket
        notifyFileSent(message);
      } else {
        // Plain text — send via WebSocket for real-time delivery
        const sent = sendWsMessage(trimmed);
        if (!sent) {
          // Fallback to REST if WS is not connected
          const message = await chatApi.sendMessage(conversationId, trimmed);
          appendMessage({
            id: message.id,
            sender_id: message.sender_id,
            content: message.content,
            file_url: null,
            file_name: '',
            created_at: message.created_at,
            is_read: false,
          });
        }
      }
      setText('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      onMessageSent?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3 border-t border-white/10 bg-gray-900/80 backdrop-blur">
      {/* File preview */}
      {file && (
        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-white/5 rounded-lg text-sm text-gray-300">
          <Paperclip className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="truncate flex-1">{file.name}</span>
          <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}>
            <X className="w-4 h-4 text-gray-400 hover:text-red-400" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Attach file */}
        <button
          onClick={() => fileRef.current?.click()}
          className="p-2.5 rounded-xl text-gray-400 hover:text-primary hover:bg-white/5 transition-colors flex-shrink-0"
          title="Attach file"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <input type="file" ref={fileRef} className="hidden" onChange={handleFileChange} />

        {/* Text input */}
        <textarea
          value={text}
          onChange={handleTyping}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
          rows={1}
          className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors max-h-32 overflow-y-auto"
          style={{ lineHeight: '1.5' }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={sending || (!text.trim() && !file)}
          className="p-2.5 bg-gradient-to-br from-primary to-violet-600 rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex-shrink-0"
        >
          {sending
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <Send className="w-5 h-5" />
          }
        </button>
      </div>
    </div>
  );
}
