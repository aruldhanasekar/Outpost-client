import { Loader2, Trash2, Reply, Forward, Paperclip, Download } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
import { Email } from './types';
import { formatFileSize, formatRelativeTime } from '@/utils/formatters';
import { stripQuotedReply } from '@/utils/emailHelpers';

interface MobileSentThreadDetailProps {
  subject: string;
  emails: Email[];
  loading: boolean;
  userEmail: string;
  onClose: () => void;
  onDelete?: () => void;
  onReply?: (email: Email) => void;      // v2.0: Reply handler
  onReplyAll?: (email: Email) => void;   // v4.0: Reply All handler
  onForward?: (email: Email) => void;    // v2.0: Forward handler
}

// Collapsed email row component for mobile sent view
interface MobileCollapsedSentEmailCardProps {
  email: Email;
  userEmail: string;
  onClick: () => void;
}

function MobileCollapsedSentEmailCard({ email, userEmail, onClick }: MobileCollapsedSentEmailCardProps) {
  const isUserSender = email.senderEmail?.toLowerCase() === userEmail?.toLowerCase();
  const displayName = isUserSender ? 'You' : email.sender;
  const hasAttachment = email.hasAttachment || (email.attachments && email.attachments.length > 0);
  
  return (
    <div 
      onClick={onClick}
      className="mb-2 bg-white rounded-lg px-4 py-3 cursor-pointer active:bg-gray-50"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-800 w-24 truncate flex-shrink-0">
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

// Animated email item with smooth expand/collapse (Mobile Sent)
interface AnimatedMobileSentEmailItemProps {
  email: Email;
  isExpanded: boolean;
  isLatest: boolean;
  isLast: boolean;
  userEmail: string;
  onToggle: () => void;
  onReply?: (email: Email) => void;
  onForward?: (email: Email) => void;
}

function AnimatedMobileSentEmailItem({ 
  email, 
  isExpanded, 
  isLatest, 
  isLast,
  userEmail, 
  onToggle,
  onReply,
  onForward
}: AnimatedMobileSentEmailItemProps) {
  const isUserSender = email.senderEmail?.toLowerCase() === userEmail?.toLowerCase();
  const displayName = isUserSender ? 'You' : email.sender;
  const hasAttachment = email.hasAttachment || (email.attachments && email.attachments.length > 0);

  return (
    <div 
      id={`mobile-sent-email-${email.id}`}
      className="mb-2"
    >
      {isExpanded ? (
        <div 
          onClick={!isLatest ? onToggle : undefined}
          className={!isLatest ? 'cursor-pointer' : ''}
        >
          <MobileEmailCard 
            email={email} 
            isLast={isLast}
            userEmail={userEmail}
            onReply={onReply}
            onForward={onForward}
          />
        </div>
      ) : (
        <div 
          onClick={onToggle}
          className="bg-white rounded-lg px-4 py-3 cursor-pointer active:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-800 w-24 truncate flex-shrink-0">
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

// Individual email card props
interface MobileEmailCardProps {
  email: Email;
  isLast: boolean;
  userEmail: string;
  onReply?: (email: Email) => void;
  onForward?: (email: Email) => void;
}

// Individual email card
function MobileEmailCard({ email, isLast, userEmail, onReply, onForward }: MobileEmailCardProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(60);
  
  const isHtml = /<[a-z][\s\S]*>/i.test(email.body);
  const cleanBody = stripQuotedReply(email.body, isHtml);
  
  const isUserSender = email.senderEmail?.toLowerCase() === userEmail?.toLowerCase();
  const displayName = isUserSender ? 'You' : email.sender;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            height: auto !important;
            overflow-x: hidden;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            font-size: 15px;
            font-weight: 500;
            line-height: 1.6;
            color: #1a1a1a;
            background: transparent;
            padding: 14px;
          }
          img { max-width: 100%; height: auto; }
          a { color: #2563eb; }
        </style>
      </head>
      <body>${cleanBody}</body>
    </html>
  `;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !isHtml) return;

    const updateHeight = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc && doc.body) {
          const height = doc.body.scrollHeight;
          if (height > 0) setIframeHeight(height + 10);
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
    <div className={`bg-white rounded-lg overflow-hidden ${!isLast ? 'mb-3' : ''}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-medium text-gray-800">{displayName}</span>
        
        {/* Right side: Reply/Forward icons (always visible on mobile) + Time */}
        <div className="flex items-center gap-2">
          {/* Reply/Forward icons - always visible on mobile */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleReplyClick}
              className="p-1.5 active:bg-gray-100 rounded-md transition-colors text-gray-400"
              aria-label="Reply"
            >
              <Reply className="w-4 h-4" />
            </button>
            <button
              onClick={handleForwardClick}
              className="p-1.5 active:bg-gray-100 rounded-md transition-colors text-gray-400"
              aria-label="Forward"
            >
              <Forward className="w-4 h-4" />
            </button>
          </div>
          
          <span className="text-xs text-gray-400">{email.time}</span>
        </div>
      </div>
      
      <div className="px-4 py-3">
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
          <div className="text-[15px] font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">
            {cleanBody}
          </div>
        )}
      </div>
      
      {/* v3.0: Attachments Section */}
      {email.hasAttachment && (
        <div className="px-4 pb-3">
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
                    className="relative group rounded-lg overflow-hidden bg-gray-100 active:opacity-90 transition-opacity"
                    title={`${attachment.filename} (${formatFileSize(attachment.size)}) - Tap to download`}
                  >
                    <img
                      src={attachment.url}
                      alt={attachment.filename}
                      className="max-h-40 max-w-56 object-cover rounded-lg"
                      loading="lazy"
                    />
                    {/* Download icon overlay */}
                    <div className="absolute bottom-2 right-2 p-1.5 bg-black/50 rounded-full">
                      <Download className="w-4 h-4 text-white" />
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
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 active:bg-gray-200 rounded-lg transition-colors text-sm text-gray-700"
                    title={`${attachment.filename} (${formatFileSize(attachment.size)})`}
                  >
                    <Paperclip className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="max-w-[140px] truncate">{attachment.filename}</span>
                    <span className="text-gray-400 text-xs flex-shrink-0">{formatFileSize(attachment.size)}</span>
                    {attachment.url && (
                      <Download className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
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

export function MobileSentThreadDetail({ 
  subject, 
  emails, 
  loading, 
  userEmail, 
  onClose, 
  onDelete,
  onReply,
  onReplyAll,
  onForward
}: MobileSentThreadDetailProps) {
  // State for tracking which emails are expanded (by email id)
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
  const emailListRef = useRef<HTMLDivElement>(null);
  
  // Initialize: Latest email always expanded
  useEffect(() => {
    if (emails.length > 0) {
      const latestEmailId = emails[emails.length - 1].id;
      setExpandedEmails(new Set([latestEmailId]));
    }
  }, [emails]);
  
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
          const emailElement = document.getElementById(`mobile-sent-email-${emailId}`);
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
  
  return (
    <div className="lg:hidden fixed inset-0 bg-[#2d2d2d] z-30 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <h2 className="text-base font-semibold text-white truncate">
            {subject}
          </h2>
        </div>
        {/* Delete Button */}
        {onDelete && (
          <button 
            onClick={onDelete}
            className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white flex-shrink-0"
            aria-label="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Emails */}
      <div ref={emailListRef} className="flex-1 overflow-y-auto hide-scrollbar p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
          </div>
        ) : emails.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-zinc-500 text-sm">No emails found</p>
          </div>
        ) : (
          emails.map((email, index) => {
            const isExpanded = expandedEmails.has(email.id) || isLatestEmail(email.id);
            const isLatest = isLatestEmail(email.id);
            
            return (
              <AnimatedMobileSentEmailItem
                key={email.id}
                email={email}
                isExpanded={isExpanded}
                isLatest={isLatest}
                isLast={index === emails.length - 1}
                userEmail={userEmail}
                onToggle={() => handleToggleEmail(email.id)}
                onReply={onReply}
                onForward={onForward}
              />
            );
          })
        )}
      </div>
    </div>
  );
}