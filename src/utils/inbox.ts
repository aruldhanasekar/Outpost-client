import type { Thread, Commitment } from "@/types/inbox";

export const formatDate = (dateValue: any): string => {
  if (!dateValue) return "";
  
  try {
    let date: Date;
    
    if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      return "";
    }
    
    if (isNaN(date.getTime())) return "";
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    } else if (days < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  } catch {
    return "";
  }
};

export const formatEmailAddress = (address: any): string => {
  if (!address) return "";
  
  if (typeof address === 'object' && address !== null) {
    if (address.email) return address.email;
    if (address.address) return address.address;
    return "";
  }
  
  if (typeof address !== 'string') return String(address);
  
  const match = address.match(/<(.+)>/);
  return match ? match[1] : address;
};

export const getSenderName = (from: any): string => {
  if (!from) return "Unknown";
  
  if (typeof from === 'object' && from !== null) {
    if (from.name) return from.name;
    if (from.email) return from.email.split('@')[0];
    return "Unknown";
  }
  
  if (typeof from !== 'string') return "Unknown";
  
  const name = from.split("<")[0]?.trim();
  if (name && name.length > 0) return name;
  
  const email = from.match(/<(.+)>/)?.[1] || from;
  return email.split("@")[0] || "Unknown";
};

export const getCategoryBgColor = (category: string): string => {
  switch (category?.toUpperCase()) {
    case "URGENT": return "bg-red-500/20 text-red-400";
    case "IMPORTANT": return "bg-orange-500/20 text-orange-400";
    case "PROMISES": return "bg-blue-500/20 text-blue-400";
    case "AWAITING": return "bg-purple-500/20 text-purple-400";
    default: return "bg-zinc-500/20 text-zinc-400";
  }
};

export const getEarliestDeadline = (thread: Thread, type: "PROMISE" | "AWAITING"): string | null => {
  const items = thread.commitments?.filter(
    c => c.type === type && c.status === "pending" && c.deadline
  ) || [];
  
  if (items.length === 0) return null;
  
  return items.reduce((earliest, c) => {
    if (!earliest) return c.deadline;
    return new Date(c.deadline!) < new Date(earliest) ? c.deadline : earliest;
  }, null as string | null);
};

export const isOverdue = (deadline: string | null): boolean => {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
};

export const getWaitingDays = (dateValue: any): number => {
  if (!dateValue) return 0;
  const date = dateValue.toDate?.() || new Date(dateValue);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
};

export const formatDeadline = (deadline: string | null): string => {
  if (!deadline) return "No deadline";
  
  const date = new Date(deadline);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return `Overdue ${Math.abs(diffDays)}d`;
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays < 7) return `Due in ${diffDays}d`;
  
  return `Due ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
};

export const formatWaitingTime = (dateValue: any): string => {
  const days = getWaitingDays(dateValue);
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  if (days < 7) return `${days} days`;
  if (days < 14) return "1 week";
  if (days < 30) return `${Math.floor(days / 7)} weeks`;
  return `${Math.floor(days / 30)} months`;
};

export const getPendingCommitments = (thread: Thread, type: "PROMISE" | "AWAITING"): Commitment[] => {
  return thread.commitments?.filter(c => c.type === type && c.status === "pending") || [];
};

/**
 * Strip quoted reply text from plain text email body
 * Removes patterns like "On Mon, 8 Dec 2025, John wrote:" and everything after
 */
export const stripQuotedText = (body: string): string => {
  if (!body) return "";
  
  let cleanBody = body;
  
  // Pattern 1: "On [date], [name] wrote:" and everything after
  const onWrotePattern = /\n*On .{10,100} wrote:\s*[\s\S]*/gi;
  cleanBody = cleanBody.replace(onWrotePattern, '');
  
  // Pattern 2: "On [date] at [time], [name] wrote:"
  const onAtWrotePattern = /\n*On .{10,50} at .{5,20}, .{3,50} wrote:\s*[\s\S]*/gi;
  cleanBody = cleanBody.replace(onAtWrotePattern, '');
  
  // Pattern 3: Gmail style forwarded message separator
  const forwardedPattern = /\n*-{5,}\s*Forwarded message\s*-{5,}[\s\S]*/gi;
  cleanBody = cleanBody.replace(forwardedPattern, '');
  
  // Pattern 4: Outlook style "From: ... Sent: ... To: ..."
  const outlookPattern = /\n*From:\s*.+\nSent:\s*.+\nTo:\s*[\s\S]*/gi;
  cleanBody = cleanBody.replace(outlookPattern, '');
  
  // Pattern 5: Lines starting with > (quoted text blocks)
  const quotedLinesPattern = /\n(?:>\s*.+\n?)+/g;
  cleanBody = cleanBody.replace(quotedLinesPattern, '');
  
  // Pattern 6: Long separator lines
  const separatorPattern = /\n*[_-]{10,}[\s\S]*$/gi;
  cleanBody = cleanBody.replace(separatorPattern, '');
  
  return cleanBody.trim();
};

/**
 * Strip quoted text from HTML email body
 */
export const stripQuotedHtml = (html: string): string => {
  if (!html) return "";
  
  // Create a temporary div to parse HTML (works in browser)
  if (typeof document !== 'undefined') {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Remove Gmail quote blocks
    const gmailQuotes = tempDiv.querySelectorAll('.gmail_quote, .gmail_extra');
    gmailQuotes.forEach(el => el.remove());
    
    // Remove blockquotes (common for quoted replies)
    const blockquotes = tempDiv.querySelectorAll('blockquote');
    blockquotes.forEach(el => el.remove());
    
    // Remove Outlook quote divs
    const outlookQuotes = tempDiv.querySelectorAll('[id*="divRplyFwdMsg"], [id*="appendonsend"]');
    outlookQuotes.forEach(el => el.remove());
    
    // Remove divs with "gmail_quote" class or similar
    const quoteDivs = tempDiv.querySelectorAll('div[class*="quote"], div[class*="reply"]');
    quoteDivs.forEach(el => el.remove());
    
    return tempDiv.innerHTML;
  }
  
  // Fallback for SSR: use regex
  let cleanHtml = html;
  
  // Remove gmail_quote divs
  cleanHtml = cleanHtml.replace(/<div[^>]*class="[^"]*gmail_quote[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  
  // Remove blockquotes
  cleanHtml = cleanHtml.replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, '');
  
  return cleanHtml;
};