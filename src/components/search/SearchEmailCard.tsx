// SearchEmailCard.tsx - Email card for search results detail view
// Matches ThreadDetail EmailCard design exactly - uses iframe for HTML

import { useRef, useEffect, useState } from 'react';
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
      year: 'numeric'
    }) + ', ' + date.toLocaleTimeString('en-US', {
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(100);
  
  const displayName = email.sender || email.sender_email || 'Unknown';
  const hasAttachments = email.has_attachment || (email.attachments && email.attachments.length > 0);
  
  // Check if body contains actual HTML tags
  const isHtml = email.body_html && /<[a-z][\s\S]*>/i.test(email.body_html);
  const bodyContent = email.body_html || email.body_text || email.snippet;
  
  // HTML content for iframe (like ThreadDetail)
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { box-sizing: border-box; -ms-overflow-style: none; scrollbar-width: none; }
          *::-webkit-scrollbar { display: none; }
          html, body {
            margin: 0;
            padding: 0;
            height: auto !important;
            overflow-x: hidden;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #1a1a1a;
            background: transparent;
            padding: 0;
          }
          img { max-width: 100%; height: auto; }
          a { color: #2563eb; }
          pre { white-space: pre-wrap; word-wrap: break-word; }
          table { max-width: 100%; }
        </style>
      </head>
      <body>${bodyContent}</body>
      <script>
        function sendHeight() {
          const height = document.body.scrollHeight;
          window.parent.postMessage({ type: 'searchEmailHeight', height: height }, '*');
        }
        window.addEventListener('load', sendHeight);
        setTimeout(sendHeight, 100);
        setTimeout(sendHeight, 500);
      </script>
    </html>
  `;

  // Adjust iframe height based on content
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !isHtml) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'searchEmailHeight' && event.data.height > 0) {
        setIframeHeight(event.data.height + 10);
      }
    };

    const updateHeight = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc && doc.body) {
          const height = doc.body.scrollHeight;
          if (height > 0) setIframeHeight(height + 10);
        }
      } catch {
        // Cross-origin error
      }
    };

    window.addEventListener('message', handleMessage);
    iframe.addEventListener('load', updateHeight);
    const t1 = setTimeout(updateHeight, 100);
    const t2 = setTimeout(updateHeight, 500);

    return () => {
      window.removeEventListener('message', handleMessage);
      iframe.removeEventListener('load', updateHeight);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [bodyContent, isHtml]);

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
        {isHtml ? (
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            sandbox="allow-same-origin"
            className="w-full border-0 transition-[height] duration-200 ease-out"
            style={{ height: `${iframeHeight}px`, background: 'transparent' }}
            title="Email content"
          />
        ) : (
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {email.body_text || email.snippet}
          </div>
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