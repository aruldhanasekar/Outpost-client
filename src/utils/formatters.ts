// utils/formatters.ts - Shared formatting utilities

/**
 * Format file size in bytes to human readable string
 * @param bytes - File size in bytes
 * @returns Formatted string like "1.5 MB", "256 KB", "0 B"
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Format date to relative time string
 * @param dateString - ISO date string or null
 * @returns Formatted string like "just now", "5m ago", "2h ago", "3d ago", or "Dec 15"
 */
export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format date for display in list items
 * @param dateStr - ISO date string
 * @returns "10:30 AM" for today, "Yesterday" for yesterday, "Dec 15" for older
 */
export function formatDisplayTime(dateStr: string): string {
  if (!dateStr) return '';
  
  const emailDate = new Date(dateStr);
  if (isNaN(emailDate.getTime())) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  if (emailDate >= today) {
    return emailDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  } else if (emailDate >= yesterday) {
    return 'Yesterday';
  } else {
    return emailDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }
}

/**
 * Extract name from email string like "John Doe <john@email.com>"
 * @param emailStr - Email string in various formats
 * @returns Name part, or formatted email prefix if no name found
 */
export function extractNameFromEmail(emailStr: string): string {
  if (!emailStr) return 'Unknown';
  
  // Check for "Name <email>" format
  const match = emailStr.match(/^([^<]+)</);
  if (match) {
    return match[1].trim().replace(/"/g, '');
  }
  
  // Just email, extract part before @ and format it
  const atIndex = emailStr.indexOf('@');
  if (atIndex > 0) {
    const username = emailStr.substring(0, atIndex);
    return username.split(/[._-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
  }
  
  return emailStr;
}

/**
 * Extract email address from string like "John Doe <john@email.com>"
 * @param emailStr - Email string in various formats
 * @returns Email address only
 */
export function extractEmailAddress(emailStr: string): string {
  if (!emailStr) return '';
  
  const match = emailStr.match(/<(.+)>/);
  return match ? match[1] : emailStr;
}

/**
 * Clean snippet to show only the latest email content
 * Removes quoted replies, decodes HTML entities, truncates
 * @param text - Raw snippet text
 * @returns Cleaned snippet (max 150 chars)
 */
export function cleanSnippet(text: string): string {
  if (!text) return '';
  
  let cleaned = text;
  
  // Decode HTML entities
  cleaned = cleaned
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  // Remove quoted reply content - various patterns
  const quotePatterns = [
    /On\s+\w{3},?\s+\w{3}\s+\d{1,2},?\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s*(AM|PM)?\s*[,.]?\s*<?[^>]*>?\s*wrote:/gi,
    /On\s+\w{3}\s+\d{1,2},?\s+\d{4},?\s+at\s+\d{1,2}:\d{2}\s*(AM|PM)?,?\s+[^:]+\s*wrote:/gi,
    /On\s+\d{1,2}\/\d{1,2}\/\d{2,4}.*wrote:/gi,
    /On\s+\d{4}-\d{2}-\d{2}.*wrote:/gi,
    /[-]+\s*Original Message\s*[-]*/gi,
    /[-]+\s*Forwarded Message\s*[-]*/gi,
    /From:.*Sent:.*To:.*Subject:/gis,
    /_{3,}/g,
  ];
  
  for (const pattern of quotePatterns) {
    const match = cleaned.search(pattern);
    if (match !== -1) {
      cleaned = cleaned.substring(0, match);
    }
  }
  
  // Clean up whitespace
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
  
  // Truncate to 150 characters max
  if (cleaned.length > 150) {
    cleaned = cleaned.substring(0, 147) + '...';
  }
  
  return cleaned;
}