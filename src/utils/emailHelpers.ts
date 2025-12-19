// utils/emailHelpers.ts - Email content processing utilities

/**
 * Strip quoted reply content from email body
 * Handles Gmail, Outlook, and ReplyModal formats
 * @param body - Email body (HTML or plain text)
 * @param isHtml - Whether body is HTML
 * @returns Cleaned body without quoted replies
 */
export function stripQuotedReply(body: string, isHtml: boolean): string {
  if (!body) return '';
  
  if (isHtml) {
    let cleaned = body
      // Gmail quote class
      .replace(/<div[^>]*class="[^"]*gmail_quote[^"]*"[^>]*>[\s\S]*$/gi, '')
      .replace(/<blockquote[^>]*class="[^"]*gmail_quote[^"]*"[^>]*>[\s\S]*$/gi, '')
      .replace(/<div[^>]*class="[^"]*gmail_attr[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      // Outlook quote patterns
      .replace(/<div[^>]*id="appendonsend"[^>]*>[\s\S]*$/gi, '')
      .replace(/<hr[^>]*>[\s\S]*<div[^>]*id="divRplyFwdMsg"[^>]*>[\s\S]*$/gi, '')
      // ReplyModal border-left style quotes (double quotes in style)
      .replace(/<br\s*\/?>\s*<br\s*\/?>\s*<div\s+style\s*=\s*"[^"]*border-left[^"]*"[^>]*>[\s\S]*$/gi, '')
      .replace(/<div\s+style\s*=\s*"[^"]*border-left:\s*2px\s+solid[^"]*"[^>]*>[\s\S]*$/gi, '')
      // ReplyModal border-left style quotes (single quotes in style)
      .replace(/<br\s*\/?>\s*<br\s*\/?>\s*<div\s+style\s*=\s*'[^']*border-left[^']*'[^>]*>[\s\S]*$/gi, '')
      .replace(/<div\s+style\s*=\s*'[^']*border-left:\s*2px\s+solid[^']*'[^>]*>[\s\S]*$/gi, '');
    
    // Clean up trailing <br> tags
    cleaned = cleaned.replace(/(<br\s*\/?>\s*)+$/gi, '');
    
    return cleaned.trim();
  } else {
    const patterns = [
      /\n*On .{10,100} wrote:\s*\n[\s\S]*$/i,
      /\n*On .{10,100} wrote:\s*>[\s\S]*$/i,
      /\n*-{3,}\s*Original Message\s*-{3,}[\s\S]*$/i,
      /\n*_{3,}\s*\nFrom:[\s\S]*$/i,
    ];
    
    let cleaned = body;
    for (const pattern of patterns) {
      cleaned = cleaned.replace(pattern, '');
    }
    
    return cleaned.trim();
  }
}