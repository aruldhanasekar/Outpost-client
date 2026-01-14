// components/inbox/MobileSpamThreadDetail.tsx
// Mobile detail view for spam emails (full screen)
// v1.0: Simple view without reply/forward (spam emails)

import { ArrowLeft } from "lucide-react";
import { SpamEmail } from "../../hooks/useSpamEmails";

interface MobileSpamThreadDetailProps {
  email: SpamEmail;
  onClose: () => void;
}

export const MobileSpamThreadDetail = ({ email, onClose }: MobileSpamThreadDetailProps) => {
  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateString;
    }
  };

  // Get sender display name
  const senderName = email.from_name || email.senderEmail || email.from || 'Unknown Sender';
  const senderEmail = email.senderEmail || email.from || '';

  return (
    <div className="lg:hidden fixed inset-0 bg-[#1a1a1a] z-50 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between h-14 px-2 border-b border-zinc-700/50">
        {/* Back Button */}
        <button
          onClick={onClose}
          className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Spam Badge */}
        <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
          SPAM
        </div>

        {/* Spacer for alignment */}
        <div className="w-9" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {/* Subject */}
        <div className="px-4 py-4 border-b border-zinc-700/50">
          <h1 className="text-white text-lg font-medium">
            {email.subject || '(No Subject)'}
          </h1>
        </div>

        {/* Sender Info */}
        <div className="px-4 py-4 border-b border-zinc-700/50">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-medium flex-shrink-0">
              {senderName[0]?.toUpperCase() || '?'}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium truncate">{senderName}</span>
              </div>
              <p className="text-zinc-500 text-sm truncate">{senderEmail}</p>
              <p className="text-zinc-600 text-xs mt-1">{formatDate(email.date || email.internal_date)}</p>
            </div>
          </div>

          {/* Recipients */}
          {email.to && email.to.length > 0 && (
            <div className="mt-3 text-sm">
              <span className="text-zinc-500">To: </span>
              <span className="text-zinc-400">{email.to.join(', ')}</span>
            </div>
          )}
        </div>

        {/* Email Body */}
        <div className="px-4 py-4">
          {email.body_html ? (
            <div 
              className="text-zinc-300 text-sm leading-relaxed prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: email.body_html }}
            />
          ) : (
            <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
              {email.body_plain || email.snippet || '(No content)'}
            </p>
          )}
        </div>

        {/* Attachments */}
        {email.hasAttachment && email.attachments && email.attachments.length > 0 && (
          <div className="px-4 py-4 border-t border-zinc-700/50">
            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">
              Attachments ({email.attachments.length})
            </p>
            <div className="space-y-2">
              {email.attachments.map((attachment, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="text-zinc-300 text-sm truncate">
                    {attachment.filename || attachment.name || `Attachment ${index + 1}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Warning Footer */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-zinc-700/50 bg-red-500/5">
        <p className="text-red-400/80 text-xs text-center">
          ⚠️ This message was identified as spam by Gmail's filters
        </p>
      </div>
    </div>
  );
};

export default MobileSpamThreadDetail;