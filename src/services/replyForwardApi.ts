// services/replyForwardApi.ts
// API service for Reply and Forward email endpoints
// Supports proper Gmail threading with threadId and message headers

const API_BASE = import.meta.env.VITE_BACKEND_URL;

// ======================================================
// TYPES
// ======================================================

export interface ReplyEmailRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_html: string;
  body_text?: string;
  thread_id: string;          // REQUIRED - Gmail thread ID for threading
  in_reply_to?: string;       // Message-ID of email being replied to
  references?: string;        // Chain of Message-IDs in thread
  scheduled_at?: string;      // ISO string for Send Later
  tracking_enabled?: boolean;
  attachment_ids?: string[];
}

export interface ForwardEmailRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_html: string;
  body_text?: string;
  scheduled_at?: string;
  tracking_enabled?: boolean;
  attachment_ids?: string[];
}

export interface EmailSendResponse {
  status: 'queued' | 'scheduled';
  email_id: string;
  can_undo: boolean;
  undo_until: string | null;
  thread_id?: string;
}


// ======================================================
// HELPER: Get Auth Headers
// ======================================================
async function getAuthHeaders(): Promise<HeadersInit> {
  const { getAuth } = await import('firebase/auth');
  
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const token = await user.getIdToken();
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}


// ======================================================
// REPLY EMAIL
// ======================================================
/**
 * Send a reply email with proper Gmail threading.
 * 
 * Threading requirements:
 * - thread_id: Gmail thread ID (REQUIRED)
 * - in_reply_to: Message-ID header of the email being replied to
 * - references: Chain of all Message-IDs in the thread
 * 
 * @example
 * ```ts
 * await replyEmail({
 *   to: ['recipient@example.com'],
 *   subject: 'Re: Original Subject',
 *   body_html: '<p>My reply</p>',
 *   thread_id: 'gmail_thread_123',
 *   in_reply_to: '<original-message-id@gmail.com>'
 * });
 * ```
 */
export async function replyEmail(request: ReplyEmailRequest): Promise<EmailSendResponse> {
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${API_BASE}/api/emails/reply`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      to: request.to,
      cc: request.cc || [],
      bcc: request.bcc || [],
      subject: request.subject,
      body_html: request.body_html,
      body_text: request.body_text || '',
      thread_id: request.thread_id,
      in_reply_to: request.in_reply_to,
      references: request.references,
      scheduled_at: request.scheduled_at,
      tracking_enabled: request.tracking_enabled ?? true,
      attachment_ids: request.attachment_ids || []
    })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to send reply' }));
    throw new Error(error.detail || 'Failed to send reply');
  }
  
  return response.json();
}


// ======================================================
// FORWARD EMAIL
// ======================================================
/**
 * Forward an email.
 * 
 * Note: Forwards create a NEW thread, they don't use thread_id.
 * The forwarded content should be included in body_html/body_text.
 * 
 * @example
 * ```ts
 * await forwardEmail({
 *   to: ['new-recipient@example.com'],
 *   subject: 'Fwd: Original Subject',
 *   body_html: '<p>FYI</p><br><div>---------- Forwarded message ---------...</div>'
 * });
 * ```
 */
export async function forwardEmail(request: ForwardEmailRequest): Promise<EmailSendResponse> {
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${API_BASE}/api/emails/forward`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      to: request.to,
      cc: request.cc || [],
      bcc: request.bcc || [],
      subject: request.subject,
      body_html: request.body_html,
      body_text: request.body_text || '',
      scheduled_at: request.scheduled_at,
      tracking_enabled: request.tracking_enabled ?? true,
      attachment_ids: request.attachment_ids || []
    })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to forward email' }));
    throw new Error(error.detail || 'Failed to forward email');
  }
  
  return response.json();
}


// ======================================================
// CANCEL (UNDO) - Uses existing endpoint
// ======================================================
/**
 * Cancel a queued reply/forward email (undo).
 * Must be called within the undo window (8 seconds).
 */
export async function cancelEmail(emailId: string): Promise<{ status: string; message: string }> {
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${API_BASE}/api/emails/${emailId}/cancel`, {
    method: 'POST',
    headers
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to cancel email' }));
    throw new Error(error.detail || 'Failed to cancel email');
  }
  
  return response.json();
}