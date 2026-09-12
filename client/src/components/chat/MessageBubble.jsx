/**
 * MessageBubble.jsx — A single message in the chat window.
 */
import React, { useState } from 'react';
import { Download, Flag, Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { chatApi } from '../../services/chatApi';
import toast from 'react-hot-toast';

export default function MessageBubble({ message, isMine }) {
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);

  const handleReport = async () => {
    const reason = prompt('Reason for reporting this message:');
    if (!reason?.trim()) return;
    setReporting(true);
    try {
      await chatApi.reportMessage(message.id, reason.trim());
      setReported(true);
      toast.success('Message reported to admin.');
    } catch {
      toast.error('Failed to report message.');
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className={`flex items-end gap-2 mb-3 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Bubble */}
      <div
        className={`group relative max-w-[70%] px-4 py-2.5 rounded-2xl shadow-sm ${
          isMine
            ? 'bg-gradient-to-br from-primary to-violet-600 text-white rounded-br-none'
            : 'bg-white/10 text-white rounded-bl-none border border-white/10'
        }`}
      >
        {/* Text content */}
        {message.content && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
        )}

        {/* File attachment */}
        {message.file_url && (
          <a
            href={message.file_url}
            target="_blank"
            rel="noopener noreferrer"
            download={message.file_name || true}
            className={`flex items-center gap-2 mt-1 text-xs underline ${
              isMine ? 'text-white/80 hover:text-white' : 'text-primary hover:text-primary/80'
            }`}
          >
            <Download className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate max-w-[200px]">
              {message.file_name || 'Download file'}
            </span>
          </a>
        )}

        {/* Timestamp + read receipts */}
        <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px] opacity-60">
            {format(new Date(message.created_at), 'HH:mm')}
          </span>
          {isMine && (
            message.is_read
              ? <CheckCheck className="w-3 h-3 text-blue-300" />
              : <Check className="w-3 h-3 opacity-50" />
          )}
        </div>

        {/* Report button — only for other person's messages */}
        {!isMine && !reported && (
          <button
            onClick={handleReport}
            disabled={reporting}
            className="absolute -right-6 top-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400"
            title="Report message"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
