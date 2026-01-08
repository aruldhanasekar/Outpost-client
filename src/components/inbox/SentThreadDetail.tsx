// components/inbox/SentThreadDetail.tsx - Thread view for Sent emails
// PRODUCTION VERSION - Blocks all tracking pixels from loading in sender's view
// v2.0: Added Reply/Forward icons on each email card (hover)
// v3.0: Added attachment display with image previews

import { X, Loader2, Trash2, Reply, Forward, Paperclip, Download } from 'lucide-react';
import { useRef, useEffect, useState, useMemo } from 'react';
import { Email } from './types';
import { formatFileSize, formatRelativeTime } from '@/utils/formatters';
import { stripQuotedReply } from '@/utils/emailHelpers';

interface SentThreadDetailProps {
  subject: string;
  emails: Email[];
  loading: boolean;
  userEmail: string;
  onClose: () => void;
  onDelete?: () => void;
  // Optional: pass backend URL to block tracking domain
  backendUrl?: string;
  onReply?: (email: Email) => void;      // v2.0: Reply handler
  onReplyAll?: (email: Email) => void;   // v4.0: Reply All handler
  onForward?: (email: Email) => void;    // v2.0: Forward handler
}

// Collapsed email row component for Sent view
interface CollapsedSentEmailCardProps {
  email: Email;
  userEmail: string;
  onClick: () => void;
}

function CollapsedSentEmailCard({ email, userEmail, onClick }: CollapsedSentEmailCardProps) {
  const isUserSender = email.senderEmail?.toLowerCase() === userEmail?.toLowerCase();
  const displayName = isUserSender ? 'You' : email.sender;
  const hasAttachment = email.hasAttachment || (email.attachments && email.attachments.length > 0);
  
  return (
    <div 
      onClick={onClick}
      className="mb-2 bg-white rounded-lg px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-800 w-28 truncate flex-shrink-0">
          {displayName}
        </span>
        <span className="text-sm text-gray-500 flex-1 truncate">
          {email.preview || email.subject}
        </span>
        {hasAttachment && (
          <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        )}
        <span className="text-xs text-gray-400 flex-shrink-0">
          {email.time}
        </span>
      </div>
    </div>
  );
}

// Animated email item with smooth expand/collapse (Sent)
interface AnimatedSentEmailItemProps {
  email: Email;
  isExpanded: boolean;
  isLatest: boolean;
  isLast: boolean;
  userEmail: string;
  backendDomain: string;
  onToggle: () => void;
  onReply?: (email: Email) => void;
  onForward?: (email: Email) => void;
}

function AnimatedSentEmailItem({ 
  email, 
  isExpanded, 
  isLatest, 
  isLast,
  userEmail, 
  backendDomain,
  onToggle,
  onReply,
  onForward
}: AnimatedSentEmailItemProps) {
  const isUserSender = email.senderEmail?.toLowerCase() === userEmail?.toLowerCase();
  const displayName = isUserSender ? 'You' : email.sender;
  const hasAttachment = email.hasAttachment || (email.attachments && email.attachments.length > 0);

  return (
    <div 
      id={`sent-email-${email.id}`}
      className="mb-2"
    >
      {isExpanded ? (
        <div 
          onClick={!isLatest ? onToggle : undefined}
          className={!isLatest ? 'cursor-pointer' : ''}
        >
          <EmailCard 
            email={email} 
            isLast={isLast}
            userEmail={userEmail}
            backendDomain={backendDomain}
            onReply={onReply}
            onForward={onForward}
          />
        </div>
      ) : (
        <div 
          onClick={onToggle}
          className="bg-white rounded-lg px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-800 w-28 truncate flex-shrink-0">
              {displayName}
            </span>
            <span className="text-sm text-gray-500 flex-1 truncate">
              {email.preview || email.subject}
            </span>
            {hasAttachment && (
              <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            )}
            <span className="text-xs text-gray-400 flex-shrink-0">
              {email.time}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}


// Get backend domain for CSP blocking
const getBackendDomain = (backendUrl?: string): string => {
  if (backendUrl) {
    try {
      const url = new URL(backendUrl);
      return url.host;
    } catch {
      return '';
    }
  }
  // Default production backend domain - UPDATE THIS
  return import.meta.env.VITE_BACKEND_URL 
    ? new URL(import.meta.env.VITE_BACKEND_URL).host 
    : '';
};

/**
 * PRODUCTION: Remove ALL tracking pixels from HTML
 * 
 * This function removes:
 * 1. Outpost tracking pixels (any URL containing /track/xxx/pixel)
 * 2. Common 1x1 tracking pixels
 * 3. Hidden/invisible images (display:none, opacity:0, visibility:hidden)
 * 4. Zero-dimension images
 * 5. Known email tracking services
 */
function sanitizeTrackingPixels(body: string, backendDomain?: string): string {
  if (!body) return '';
  
  let sanitized = body;
  
  // 1. Remove Outpost tracking pixels - match full URLs
  // Handles: https://api.domain.com/track/xxx/pixel.gif
  // Handles: /track/xxx/pixel.gif
  // Handles: http://localhost:8000/track/xxx/pixel.gif
  sanitized = sanitized.replace(
    /<img[^>]*src=["'][^"']*\/track\/[^"']*\/pixel\.gif[^"']*["'][^>]*\/?>/gi,
    '<!-- tracking pixel removed -->'
  );
  
  // 2. Also remove by backend domain if provided
  if (backendDomain) {
    const escapedDomain = backendDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const domainRegex = new RegExp(
      `<img[^>]*src=["'][^"']*${escapedDomain}[^"']*["'][^>]*\\/?>`,
      'gi'
    );
    sanitized = sanitized.replace(domainRegex, '<!-- backend image removed -->');
  }
  
  // 3. Remove common 1x1 tracking pixels (various formats)
  // width="1" height="1" or width=1 height=1 or width='1' height='1'
  sanitized = sanitized.replace(
    /<img[^>]*(?:width\s*=\s*["']?1["']?\s+height\s*=\s*["']?1["']?|height\s*=\s*["']?1["']?\s+width\s*=\s*["']?1["']?)[^>]*\/?>/gi,
    '<!-- 1x1 pixel removed -->'
  );
  
  // 4. Remove zero-dimension images (0x0 pixels)
  sanitized = sanitized.replace(
    /<img[^>]*(?:width\s*=\s*["']?0["']?|height\s*=\s*["']?0["']?)[^>]*\/?>/gi,
    '<!-- zero-dim image removed -->'
  );
  
  // 5. Remove images with display:none, visibility:hidden, or opacity:0
  sanitized = sanitized.replace(
    /<img[^>]*style\s*=\s*["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0)[^"']*["'][^>]*\/?>/gi,
    '<!-- hidden image removed -->'
  );
  
  // 6. Remove known email tracking service domains
  const trackingDomains = [
    'mailtrack.io',
    'getnotify.com',
    'yesware.com',
    'bananatag.com',
    'streak.com',
    'boomeranggmail.com',
    'mixmax.com',
    'mailchimp.com/track',
    'list-manage.com/track',
    'sendgrid.net/wf',
    'mandrillapp.com/track',
    't.co/i/', // Twitter/X tracking
    'google-analytics.com',
    'facebook.com/tr',
    'px.ads',
    'pixel.ad',
    'tracking.', // Generic tracking subdomains
    '/pixel', // Generic pixel paths
    '/open/', // Common open tracking paths
    '/beacon',
    'wf/open',
    'o.gif',
    't.gif',
    'blank.gif'
  ];
  
  for (const domain of trackingDomains) {
    const escapedDomain = domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(
      `<img[^>]*src=["'][^"']*${escapedDomain}[^"']*["'][^>]*\\/?>`,
      'gi'
    );
    sanitized = sanitized.replace(regex, '<!-- tracking service removed -->');
  }
  
  return sanitized;
}
/**
 * Individual email card in the conversation
 */
interface EmailCardProps {
  email: Email;
  isLast: boolean;
  userEmail: string;
  backendDomain?: string;
  onReply?: (email: Email) => void;
  onForward?: (email: Email) => void;
}

function EmailCard({ 
  email, 
  isLast, 
  userEmail,
  backendDomain,
  onReply,
  onForward
}: EmailCardProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(60);
  
  const isHtml = /<[a-z][\s\S]*>/i.test(email.body);
  
  // Check if current user is the sender
  const isUserSender = email.senderEmail?.toLowerCase() === userEmail?.toLowerCase();
  const displayName = isUserSender ? 'You' : email.sender;

  // PRODUCTION: Process email body with all protections
  const cleanBody = useMemo(() => {
    // Step 1: Remove tracking pixels
    const sanitized = sanitizeTrackingPixels(email.body, backendDomain);
    // Step 2: Strip quoted replies
    return stripQuotedReply(sanitized, isHtml);
  }, [email.body, isHtml, backendDomain]);

  // Build secure HTML content with CSP
  const htmlContent = useMemo(() => {
    // Content Security Policy to block tracking domains
    // This is the FINAL defense layer - blocks any pixels that slip through
    const blockedDomains = backendDomain ? `https://${backendDomain} http://${backendDomain}` : '';
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta http-equiv="Content-Security-Policy" content="
            default-src 'none';
            style-src 'unsafe-inline';
            img-src data: https: http: blob:;
            font-src https: data:;
          ">
          <style>
            * { box-sizing: border-box; -ms-overflow-style: none; scrollbar-width: none; }
            *::-webkit-scrollbar { display: none; }
            html, body {
              margin: 0;
              padding: 0;
              height: auto !important;
              min-height: 0 !important;
              overflow: hidden;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
              font-size: 15px;
              font-weight: 500;
              line-height: 1.6;
              color: #1a1a1a;
              background: transparent;
              padding: 16px;
            }
            img { max-width: 100%; height: auto; }
            table { max-width: 100%; }
            a { color: #2563eb; }
            /* Hide any remaining tiny images that might be trackers */
            img[width="1"], img[height="1"],
            img[width="0"], img[height="0"] {
              display: none !important;
            }
          </style>
        </head>
        <body>${cleanBody}</body>
      </html>
    `;
  }, [cleanBody, backendDomain]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !isHtml) return;

    const updateHeight = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc && doc.body) {
          const height = doc.body.scrollHeight;
          if (height > 0) {
            setIframeHeight(height + 10);
          }
        }
      } catch {
        // Cross-origin or access error - ignore
      }
    };

    iframe.addEventListener('load', updateHeight);
    // Single height check after load
    const t1 = setTimeout(updateHeight, 100);

    return () => {
      iframe.removeEventListener('load', updateHeight);
      clearTimeout(t1);
    };
  }, [cleanBody, isHtml]);

  // v2.0: Handle reply click
  const handleReplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onReply) {
      onReply(email);
    } else {
      console.log('Reply to:', email.id, email.senderEmail, email.subject);
    }
  };

  // v2.0: Handle forward click
  const handleForwardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onForward) {
      onForward(email);
    } else {
      console.log('Forward:', email.id, email.subject);
    }
  };

  return (
    <div className={`group bg-white rounded-lg shadow-sm ${!isLast ? 'mb-4' : ''}`}>
      {/* Email Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <span className="text-sm font-medium text-gray-800">
          {displayName}
        </span>
        
        {/* Right side: Reply/Forward icons (hover) + Time */}
        <div className="flex items-center gap-2">
          {/* Reply/Forward icons - show on hover */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Reply button with tooltip */}
            <div className="relative group/btn">
              <button
                onClick={handleReplyClick}
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
                onClick={handleForwardClick}
                className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-gray-600"
              >
                <Forward className="w-4 h-4" />
              </button>
              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-1 bg-zinc-900 text-white text-xs rounded-md opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[9999] shadow-lg">
                Forward
              </span>
            </div>
          </div>
          
          <span className="text-xs text-gray-400">
            {email.time}
          </span>
        </div>
      </div>
      
      {/* Email Body */}
      <div className="px-5 py-4">
        {isHtml ? (
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            // SECURITY: Restrictive sandbox - no scripts, no forms, no popups
            sandbox="allow-same-origin"
            className="w-full border-0 transition-[height] duration-200 ease-out"
            style={{ height: `${iframeHeight}px`, background: 'transparent' }}
            title="Email content"
            // Referrer policy to prevent leaking referer to tracking pixels
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="text-[15px] font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">
            {cleanBody}
          </div>
        )}
      </div>
      
      {/* v3.0: Attachments Section */}
      {email.hasAttachment && (
        <div className="px-5 pb-4">
          {/* Image Attachments - Grid Preview */}
          {email.attachments && email.attachments.filter(a => a.content_type?.startsWith('image/')).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {email.attachments
                .filter(a => a.content_type?.startsWith('image/'))
                .map((attachment, idx) => (
                  <a
                    key={attachment.id || `img-${idx}`}
                    href={attachment.url || '#'}
                    download={attachment.filename}
                    className="relative group/img rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity"
                    title={`${attachment.filename} (${formatFileSize(attachment.size)}) - Click to download`}
                  >
                    <img
                      src={attachment.url}
                      alt={attachment.filename}
                      className="max-h-48 max-w-64 object-cover rounded-lg"
                      loading="lazy"
                    />
                    {/* Download overlay on hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <Download className="w-6 h-6 text-white" />
                    </div>
                  </a>
                ))}
            </div>
          )}
          
          {/* Non-Image Attachments - Link Style */}
          {email.attachments && email.attachments.filter(a => !a.content_type?.startsWith('image/')).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {email.attachments
                .filter(a => !a.content_type?.startsWith('image/'))
                .map((attachment, idx) => (
                  <a
                    key={attachment.id || `file-${idx}`}
                    href={attachment.url || '#'}
                    download={attachment.filename}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm text-gray-700 group/file"
                    title={`${attachment.filename} (${formatFileSize(attachment.size)})`}
                  >
                    <Paperclip className="w-4 h-4 text-gray-500" />
                    <span className="max-w-[180px] truncate">{attachment.filename}</span>
                    <span className="text-gray-400 text-xs">{formatFileSize(attachment.size)}</span>
                    {attachment.url && (
                      <Download className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover/file:opacity-100 transition-opacity" />
                    )}
                  </a>
                ))}
            </div>
          )}
          
          {/* Fallback when no attachment data */}
          {(!email.attachments || email.attachments.length === 0) && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-500">
              <Paperclip className="w-4 h-4" />
              <span>Attachment</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Main component: Sent email thread detail view
 */
export function SentThreadDetail({ 
  subject, 
  emails, 
  loading, 
  userEmail, 
  onClose, 
  onDelete,
  backendUrl,
  onReply,
  onReplyAll,
  onForward
}: SentThreadDetailProps) {
  const backendDomain = useMemo(() => getBackendDomain(backendUrl), [backendUrl]);
  
  // State for tracking which emails are expanded (by email id)
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
  const emailListRef = useRef<HTMLDivElement>(null);
  
  // Detect OS for keyboard shortcut display
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  // Initialize: Latest email always expanded
  useEffect(() => {
    if (emails.length > 0) {
      const latestEmailId = emails[emails.length - 1].id;
      setExpandedEmails(new Set([latestEmailId]));
    }
  }, [emails]);
  
  // Get the latest email for keyboard shortcuts
  const latestEmail = emails.length > 0 ? emails[emails.length - 1] : null;
  
  // Handle expanding a collapsed email
  // Handle toggling email expanded/collapsed state
  const handleToggleEmail = (emailId: string) => {
    // Don't allow collapsing the latest email
    if (isLatestEmail(emailId)) return;
    
    setExpandedEmails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        // Collapse it
        newSet.delete(emailId);
      } else {
        // Expand it
        newSet.add(emailId);
        // Scroll to the expanded email after a short delay
        setTimeout(() => {
          const emailElement = document.getElementById(`sent-email-${emailId}`);
          if (emailElement && emailListRef.current) {
            emailElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
      return newSet;
    });
  };
  
  // Check if an email is the latest
  const isLatestEmail = (emailId: string) => {
    return emails.length > 0 && emails[emails.length - 1].id === emailId;
  };
  
  // Ref to track last key pressed for R+A combo
  const lastKeyRef = useRef<string | null>(null);
  
  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // R+A for Reply All (check if A is pressed while R was recently pressed)
      if (e.key.toLowerCase() === 'a' && lastKeyRef.current === 'r') {
        e.preventDefault();
        if (latestEmail && onReplyAll) {
          onReplyAll(latestEmail);
        }
        lastKeyRef.current = null;
        return;
      }
      
      // R for Reply
      if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        lastKeyRef.current = 'r';
        // Set timeout to clear if A is not pressed
        setTimeout(() => {
          if (lastKeyRef.current === 'r') {
            if (latestEmail && onReply) {
              onReply(latestEmail);
            }
            lastKeyRef.current = null;
          }
        }, 300);
        return;
      }
      
      // F for Forward
      if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (latestEmail && onForward) {
          onForward(latestEmail);
        }
        return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [latestEmail, onReply, onReplyAll, onForward]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex-1 min-w-0 pr-4">
          <h2 className="text-lg font-semibold text-white truncate">
            {subject}
          </h2>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Delete Button */}
          {onDelete && (
            <button 
              onClick={onDelete}
              className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
              title="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Conversation - All Emails */}
      <div ref={emailListRef} className="flex-1 overflow-y-auto hide-scrollbar px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
          </div>
        ) : emails.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-zinc-500 text-sm">No emails found</p>
          </div>
        ) : (
          <div className="max-w-[650px] mx-auto">
            {emails.map((email, index) => {
              const isExpanded = expandedEmails.has(email.id) || isLatestEmail(email.id);
              const isLatest = isLatestEmail(email.id);
              
              return (
                <AnimatedSentEmailItem
                  key={email.id}
                  email={email}
                  isExpanded={isExpanded}
                  isLatest={isLatest}
                  isLast={index === emails.length - 1}
                  userEmail={userEmail}
                  backendDomain={backendDomain}
                  onToggle={() => handleToggleEmail(email.id)}
                  onReply={onReply}
                  onForward={onForward}
                />
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// Type extension for Email to include tracking fields
declare module './types' {
  interface Email {
    opened?: boolean;
    open_count?: number;
    recipient_open_count?: number;
    first_opened_at?: string;
    last_opened_at?: string;
  }
}