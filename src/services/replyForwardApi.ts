// services/replyForwardApi.ts
// API service for Reply and Forward email endpoints
// ✅ Automatic endpoint routing based on auth_method (like emailApi.ts)

import { auth } from '../firebase.config';

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
// HELPER: Get Auth Token
// ======================================================
async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.getIdToken();
}


// ======================================================
// HELPER: Get Auth Method from Firebase Custom Claims
// ======================================================
async function getAuthMethod(): Promise<'direct' | 'composio'> {
  const user = auth.currentUser;
  if (!user) return 'direct';
  
  try {
    const idTokenResult = await user.getIdTokenResult();
    const authMethod = idTokenResult.claims.auth_method as string;
    
    // Default to 'direct' if not set
    return authMethod === 'composio' ? 'composio' : 'direct';
  } catch (error) {
    console.error('Failed to get auth method from claims:', error);
    return 'direct';
  }
}


// ======================================================
// HELPER: API Call with Automatic Routing
// ======================================================
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  const authMethod = await getAuthMethod();
  
  // Route: Replace /api/emails with correct prefix based on auth method
  let routedEndpoint = endpoint;
  if (authMethod === 'composio' && endpoint.startsWith('/api/emails')) {
    routedEndpoint = endpoint.replace('/api/emails', '/api/composio/emails');
    console.log(`🔀 Routing to Composio: ${endpoint} → ${routedEndpoint}`);
  }
  
  const response = await fetch(`${API_BASE}${routedEndpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
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
 * Automatically routes to:
 * - Direct Auth: /api/emails/reply
 * - Composio: /api/composio/emails/reply
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
  return apiCall('/api/emails/reply', {
    method: 'POST',
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
 * Automatically routes to:
 * - Direct Auth: /api/emails/forward
 * - Composio: /api/composio/emails/forward
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
  return apiCall('/api/emails/forward', {
    method: 'POST',
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
}


// ======================================================
// CANCEL (UNDO) - Uses existing endpoint
// ======================================================
/**
 * Cancel a queued reply/forward email (undo).
 * Must be called within the undo window (8 seconds).
 * 
 * Automatically routes to:
 * - Direct Auth: /api/emails/{emailId}/cancel
 * - Composio: /api/composio/emails/{emailId}/cancel
 */
export async function cancelEmail(emailId: string): Promise<{ status: string; message: string }> {
  return apiCall(`/api/emails/${emailId}/cancel`, {
    method: 'DELETE',
  });
}