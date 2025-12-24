// SearchEmailCard.tsx - Email card for search results detail view
// Matches ThreadDetail EmailCard design exactly

import { Reply, Forward, Paperclip, Download } from 'lucide-react';

export interface SearchEmailData {
  id: string;
  thread_id: string;
  subject: string;
  sender: string;
  sender_email: string;
  recipients: string[];
  date: string;
  time?: string;
  snippet: string;
  body_html?: string;
  body_text?: string;
  category: string;
  source: string;
  has_attachment: boolean;
  is_read: boolean;
  message_id?: string;
  attachments?: Array<{
    id?: string;
    filename: string;
    mimeType?: string;
    content_type?: string;
    size?: number;
    url?: string;
  }>;
}

interface SearchEmailCardProps {
  email: SearchEmailData;
  onReply?: () => void;
  onForward?: () => void;
}

// Format date for card header
function formatCardDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

// Format file size
function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function SearchEmailCard({ email, onReply, onForward }: SearchEmailCardProps) {
  const displayName = email.sender || email.sender_email || 'Unknown';
  const hasAttachments = email.has_attachment || (email.attachments && email.attachments.length > 0);

  return (
    <div className="group bg-white rounded-lg shadow-sm">
      {/* Card Header - Sender + Reply/Forward (hover) + Date */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800">{displayName}</span>
        </div>
        
        {/* Right side: Reply/Forward icons (hover) + Date */}
        <div className="flex items-center gap-2">
          {/* Reply/Forward icons - show on hover */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Reply button with tooltip */}
            <div className="relative group/btn">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReply?.();
                }}
                className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-gray-600"
              >
                <Reply className="w-4 h-4" />
              </button>
              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-1 bg-zinc-900 text-white text-xs rounded-md opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[9999] shadow-lg">
                Reply
              </span>
            </div>
            {/* Forward button with tooltip */}
            <div className="relative group/btn">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onForward?.();
                }}
                className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-gray-600"
              >
                <Forward className="w-4 h-4" />
              </button>
              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-1 bg-zinc-900 text-white text-xs rounded-md opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[9999] shadow-lg">
                Forward
              </span>
            </div>
          </div>
          
          <span className="text-xs text-gray-400">{formatCardDate(email.date)}</span>
        </div>
      </div>
      
      {/* Card Body - Email Content */}
      <div className="px-5 py-4">
        {email.body_html ? (
          <div 
            className="prose prose-sm max-w-none
              prose-p:text-gray-700 prose-p:my-2 prose-p:leading-relaxed
              prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-gray-900
              prose-headings:text-gray-900
              prose-li:text-gray-700
              prose-img:rounded-lg prose-img:max-w-full
              prose-blockquote:border-gray-300 prose-blockquote:text-gray-600
              [&_table]:text-gray-700 [&_td]:p-2 [&_th]:p-2"
            dangerouslySetInnerHTML={{ __html: email.body_html }}
          />
        ) : email.body_text ? (
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {email.body_text}
          </div>
        ) : (
          <p className="text-gray-600 text-sm">{email.snippet}</p>
        )}
      </div>
      
      {/* Card Attachments */}
      {hasAttachments && email.attachments && email.attachments.length > 0 && (
        <div className="px-5 pb-4">
          <div className="flex flex-wrap gap-2">
            {email.attachments.map((attachment, idx) => (
              <a
                key={attachment.id || idx}
                href={attachment.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm text-gray-700 group/attach"
                title={attachment.filename}
              >
                <Paperclip className="w-4 h-4 text-gray-500" />
                <span className="max-w-[180px] truncate">{attachment.filename}</span>
                {attachment.size && (
                  <span className="text-gray-400 text-xs">
                    {formatFileSize(attachment.size)}
                  </span>
                )}
                <Download className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover/attach:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        </div>
      )}
      
      {/* Fallback when hasAttachment but no attachment data */}
      {hasAttachments && (!email.attachments || email.attachments.length === 0) && (
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-500">
            <Paperclip className="w-4 h-4" />
            <span>Attachment</span>
          </div>
        </div>
      )}
    </div>
  );
}