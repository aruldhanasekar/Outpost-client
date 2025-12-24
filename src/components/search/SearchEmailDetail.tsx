// SearchEmailDetail.tsx - Full email detail view component
// Features:
// - Shows complete email with full HTML body
// - Displays sender, recipients, subject, date
// - Attachments list
// - Category badge
// - Responsive scrolling

import { Mail, Paperclip, Download, ExternalLink, User, Calendar, Tag } from 'lucide-react';
import { SearchResult } from '@/services/searchApi';

interface SearchEmailDetailProps {
  email: SearchResult | null;
  userEmail: string;
}

// Category badge colors
const categoryColors: Record<string, string> = {
  'URGENT': 'bg-red-500/20 text-red-400 border-red-500/30',
  'IMPORTANT': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'PROMISES': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'AWAITING': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'OTHERS': 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

// Format date for display
const formatFullDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return dateString;
  }
};

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Get file icon based on type
const getFileIcon = (mimeType: string): string => {
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦';
  return '📎';
};

export function SearchEmailDetail({ email, userEmail }: SearchEmailDetailProps) {
  // Empty state
  if (!email) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <Mail className="w-16 h-16 text-zinc-700 mb-4" />
        <p className="text-zinc-500 text-sm">Select an email to view</p>
      </div>
    );
  }

  const isUserSender = email.sender_email?.toLowerCase() === userEmail?.toLowerCase();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Email Header */}
      <div className="px-6 py-5 border-b border-zinc-700/30">
        {/* Subject */}
        <h2 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: "'Manrope', sans-serif" }}>
          {email.subject || '(No subject)'}
        </h2>
        
        {/* Sender Info */}
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-[#8FA8A3]/20 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-[#8FA8A3]" />
          </div>
          
          {/* Sender Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-medium">
                {isUserSender ? 'You' : email.sender}
              </span>
              {email.category && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${categoryColors[email.category] || categoryColors['OTHERS']}`}>
                  {email.category}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 truncate">
              {email.sender_email}
            </p>
          </div>
          
          {/* Date */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 flex-shrink-0">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatFullDate(email.date)}</span>
          </div>
        </div>
        
        {/* Recipients */}
        <div className="space-y-1.5">
          {email.recipients && email.recipients.length > 0 && (
            <div className="flex items-start gap-2 text-xs">
              <span className="text-zinc-500 w-8 flex-shrink-0">To:</span>
              <span className="text-zinc-400 break-all">
                {email.recipients.join(', ')}
              </span>
            </div>
          )}
          {email.cc && email.cc.length > 0 && (
            <div className="flex items-start gap-2 text-xs">
              <span className="text-zinc-500 w-8 flex-shrink-0">Cc:</span>
              <span className="text-zinc-400 break-all">
                {email.cc.join(', ')}
              </span>
            </div>
          )}
        </div>
        
        {/* Source Badge */}
        <div className="flex items-center gap-2 mt-3">
          <Tag className="w-3 h-3 text-zinc-500" />
          <span className="text-xs text-zinc-500 capitalize">
            Found in: {email.source}
          </span>
        </div>
      </div>
      
      {/* Email Body */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        <div className="px-6 py-5">
          {email.body_html ? (
            <div 
              className="prose prose-invert prose-sm max-w-none
                prose-p:text-zinc-300 prose-p:leading-relaxed prose-p:my-3
                prose-a:text-[#8FA8A3] prose-a:no-underline hover:prose-a:underline
                prose-strong:text-white prose-strong:font-semibold
                prose-em:text-zinc-300
                prose-ul:text-zinc-300 prose-ol:text-zinc-300
                prose-li:my-1
                prose-blockquote:border-l-[#8FA8A3] prose-blockquote:text-zinc-400 prose-blockquote:bg-zinc-800/30 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r
                prose-code:text-[#8FA8A3] prose-code:bg-zinc-800 prose-code:px-1 prose-code:rounded
                prose-pre:bg-zinc-800 prose-pre:rounded-lg
                prose-hr:border-zinc-700
                prose-img:rounded-lg prose-img:max-w-full
                prose-table:text-zinc-300
                prose-th:text-white prose-th:border-zinc-700
                prose-td:border-zinc-700
              "
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(email.body_html) }}
            />
          ) : email.body_text ? (
            <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
              {email.body_text}
            </div>
          ) : email.snippet ? (
            <div className="text-zinc-300 text-sm leading-relaxed">
              {email.snippet}
            </div>
          ) : (
            <p className="text-zinc-500 text-sm italic">No content available</p>
          )}
        </div>
        
        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="px-6 py-4 border-t border-zinc-700/30">
            <div className="flex items-center gap-2 mb-3">
              <Paperclip className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-400 font-medium">
                {email.attachments.length} Attachment{email.attachments.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {email.attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 px-3 py-2.5 bg-zinc-800/50 rounded-lg border border-zinc-700/50 hover:border-zinc-600/50 transition-colors group"
                >
                  {/* File Icon */}
                  <span className="text-lg">
                    {getFileIcon(attachment.mimeType || '')}
                  </span>
                  
                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 truncate">
                      {attachment.filename || 'Attachment'}
                    </p>
                    {attachment.size && (
                      <p className="text-xs text-zinc-500">
                        {formatFileSize(attachment.size)}
                      </p>
                    )}
                  </div>
                  
                  {/* Download Button */}
                  {attachment.url && (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-zinc-700 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-zinc-400" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Basic HTML sanitization (you may want to use DOMPurify in production)
function sanitizeHtml(html: string): string {
  // Remove script tags
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove onclick and other event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: URLs (potential XSS)
  sanitized = sanitized.replace(/data:/gi, 'data-blocked:');
  
  return sanitized;
}

export default SearchEmailDetail;