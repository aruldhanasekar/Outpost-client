// MobileSearchEmailCard.tsx - Fullscreen email card for mobile search
// Shows only the email when clicked, with back button to return to list

import { useRef, useEffect, useState } from 'react';
import { X, Reply, Forward, Paperclip, Download, ChevronLeft } from 'lucide-react';

export interface MobileSearchEmailData {
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

interface MobileSearchEmailCardProps {
  email: MobileSearchEmailData;
  onClose: () => void;
  onReply?: () => void;
  onForward?: () => void;
}

// Format date for header
function formatDate(dateStr: string): string {
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

export function MobileSearchEmailCard({ email, onClose, onReply, onForward }: MobileSearchEmailCardProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(200);
  
  const displayName = email.sender || email.sender_email || 'Unknown';
  const hasAttachments = email.has_attachment || (email.attachments && email.attachments.length > 0);
  
  // Check if body contains actual HTML tags
  const isHtml = email.body_html && /<[a-z][\s\S]*>/i.test(email.body_html);
  const bodyContent = email.body_html || email.body_text || email.snippet;
  
  // HTML content for iframe
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
          window.parent.postMessage({ type: 'mobileSearchEmailHeight', height: height }, '*');
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
      if (event.data?.type === 'mobileSearchEmailHeight' && event.data.height > 0) {
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
    <div className="fixed inset-0 z-50 bg-[#1a1a1a] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex-shrink-0">
        <button 
          onClick={onClose}
          className="p-1.5 -ml-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-zinc-400" />
        </button>
        
        <h1 className="flex-1 text-white font-medium text-sm truncate mx-3">
          {email.subject || '(no subject)'}
        </h1>
        
        <button 
          onClick={onClose}
          className="p-1.5 -mr-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-zinc-400" />
        </button>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Email Card */}
        <div className="m-4">
          <div className="bg-white rounded-lg shadow-sm">
            {/* Card Header - Sender + Reply/Forward (always visible on mobile) + Date */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-800">{displayName}</span>
              
              {/* Right side: Reply/Forward icons (always visible) + Date */}
              <div className="flex items-center gap-2">
                {/* Reply/Forward icons - always visible on mobile */}
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={onReply}
                    className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-gray-600"
                  >
                    <Reply className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onForward}
                    className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-gray-600"
                  >
                    <Forward className="w-4 h-4" />
                  </button>
                </div>
                
                <span className="text-xs text-gray-400">{formatDate(email.date)}</span>
              </div>
            </div>
            
            {/* Card Body */}
            <div className="px-4 py-4">
              {isHtml ? (
                <iframe
                  ref={iframeRef}
                  srcDoc={htmlContent}
                  sandbox="allow-same-origin"
                  className="w-full border-0"
                  style={{ height: `${iframeHeight}px`, background: 'transparent' }}
                  title="Email content"
                />
              ) : (
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {email.body_text || email.snippet}
                </div>
              )}
            </div>
            
            {/* Attachments */}
            {hasAttachments && email.attachments && email.attachments.length > 0 && (
              <div className="px-4 pb-4">
                <div className="flex flex-wrap gap-2">
                  {email.attachments.map((attachment, idx) => (
                    <a
                      key={attachment.id || idx}
                      href={attachment.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm text-gray-700"
                      title={attachment.filename}
                    >
                      <Paperclip className="w-4 h-4 text-gray-500" />
                      <span className="max-w-[150px] truncate">{attachment.filename}</span>
                      {attachment.size && (
                        <span className="text-gray-400 text-xs">
                          {formatFileSize(attachment.size)}
                        </span>
                      )}
                      <Download className="w-3.5 h-3.5 text-gray-400" />
                    </a>
                  ))}
                </div>
              </div>
            )}
            
            {/* Fallback */}
            {hasAttachments && (!email.attachments || email.attachments.length === 0) && (
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-500">
                  <Paperclip className="w-4 h-4" />
                  <span>Attachment</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}