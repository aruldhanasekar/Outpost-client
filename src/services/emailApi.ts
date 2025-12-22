// services/emailApi.ts - API calls for email actions
// ✅ MODIFIED: Automatic endpoint routing based on auth_method

import { auth } from '../firebase.config';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

// Helper to get auth token
async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.getIdToken();
}

// ✅ NEW: Get auth method from Firebase custom claims
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

// ✅ MODIFIED: Helper for API calls with automatic endpoint routing
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  const authMethod = await getAuthMethod();
  
  // ✅ ROUTE: Replace /api/emails with correct prefix based on auth method
  let routedEndpoint = endpoint;
  if (authMethod === 'composio' && endpoint.startsWith('/api/emails')) {
    routedEndpoint = endpoint.replace('/api/emails', '/api/composio/emails');
    console.log(`🔀 Routing to Composio: ${endpoint} → ${routedEndpoint}`);
  }
  
  const response = await fetch(`${API_BASE_URL}${routedEndpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
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
// EMAIL API FUNCTIONS
// ✅ NO CHANGES NEEDED BELOW - Automatic routing handles everything!
// ======================================================

/**
 * Mark email as read
 * - Updates Firestore: is_read = true
 * - Updates Gmail: removes UNREAD label
 * 
 * Automatically routes to:
 * - Direct Auth: /api/emails/{emailId}/read
 * - Composio: /api/composio/emails/{emailId}/read
 */
export async function markEmailAsRead(emailId: string): Promise<{
  status: string;
  message: string;
  email_id: string;
  gmail_synced?: boolean;
  already_read?: boolean;
}> {
  return apiCall(`/api/emails/${emailId}/read`, {
    method: 'POST',
  });
}

/**
 * Mark email as unread
 * - Updates Firestore: is_read = false
 * - Updates Gmail: adds UNREAD label
 * 
 * Automatically routes to:
 * - Direct Auth: /api/emails/{emailId}/unread
 * - Composio: /api/composio/emails/{emailId}/unread
 */
export async function markEmailAsUnread(emailId: string): Promise<{
  status: string;
  message: string;
  email_id: string;
  gmail_synced?: boolean;
  already_unread?: boolean;
}> {
  return apiCall(`/api/emails/${emailId}/unread`, {
    method: 'POST',
  });
}

/**
 * Mark email as done
 * - Updates Firestore: user_marked_done = true, visibility flags = false
 * - Updates Gmail: removes INBOX label (archives email)
 * 
 * Automatically routes to:
 * - Direct Auth: /api/emails/{emailId}/done
 * - Composio: /api/composio/emails/{emailId}/done
 */
export async function markEmailAsDone(emailId: string): Promise<{
  status: string;
  message: string;
  email_id: string;
  original_category: string;
  already_done?: boolean;
}> {
  return apiCall(`/api/emails/${emailId}/done`, {
    method: 'POST',
  });
}

/**
 * Mark email as undone (restore to inbox)
 * - Updates Firestore: user_marked_done = false, restores visibility flags
 * - Updates Gmail: adds INBOX label (unarchives email)
 * 
 * Automatically routes to:
 * - Direct Auth: /api/emails/{emailId}/undone
 * - Composio: /api/composio/emails/{emailId}/undone
 */
export async function markEmailAsUndone(emailId: string): Promise<{
  status: string;
  message: string;
  email_id: string;
  restored_category: string;
  already_undone?: boolean;
}> {
  return apiCall(`/api/emails/${emailId}/undone`, {
    method: 'POST',
  });
}

/**
 * Delete email
 * - Updates Firestore: deleted = true, visibility flags = false
 * - Updates Gmail: adds TRASH label (moves to trash)
 * 
 * Automatically routes to:
 * - Direct Auth: /api/emails/{emailId}
 * - Composio: /api/composio/emails/{emailId}
 */
export async function deleteEmail(emailId: string): Promise<{
  status: string;
  message: string;
  email_id: string;
  gmail_trashed?: boolean;
  already_deleted?: boolean;
  original_category?: string;
}> {
  return apiCall(`/api/emails/${emailId}`, {
    method: 'DELETE',
  });
}

/**
 * Restore email from trash
 * - Updates Firestore: deleted = false, restores visibility flags
 * - Updates Gmail: removes TRASH label (restores from trash)
 * 
 * Automatically routes to:
 * - Direct Auth: /api/emails/{emailId}/restore
 * - Composio: /api/composio/emails/{emailId}/restore
 */
export async function restoreEmail(emailId: string): Promise<{
  status: string;
  message: string;
  email_id: string;
  gmail_restored?: boolean;
  restored_category: string;
  already_restored?: boolean;
}> {
  return apiCall(`/api/emails/${emailId}/restore`, {
    method: 'POST',
  });
}

// ======================================================
// BATCH API FUNCTIONS
// ✅ Automatic routing based on auth_method
// ======================================================

/**
 * Batch mark emails as read
 * - Updates Firestore: is_read = true for all emails
 * - Updates Gmail: removes UNREAD label from all emails
 * 
 * Automatically routes to:
 * - Direct Auth: /api/emails/batch/read
 * - Composio: /api/composio/emails/batch/read
 */
export async function batchMarkAsRead(emailIds: string[]): Promise<{
  status: string;
  message: string;
  success_count: number;
  failed_count: number;
  failed_ids: string[];
  threads_updated?: number;
}> {
  return apiCall('/api/emails/batch/read', {
    method: 'POST',
    body: JSON.stringify({ email_ids: emailIds }),
  });
}

/**
 * Batch mark emails as unread
 * - Updates Firestore: is_read = false for all emails
 * - Updates Gmail: adds UNREAD label to all emails
 * 
 * Automatically routes to:
 * - Direct Auth: /api/emails/batch/unread
 * - Composio: /api/composio/emails/batch/unread
 */
export async function batchMarkAsUnread(emailIds: string[]): Promise<{
  status: string;
  message: string;
  success_count: number;
  failed_count: number;
  failed_ids: string[];
  threads_updated?: number;
}> {
  return apiCall('/api/emails/batch/unread', {
    method: 'POST',
    body: JSON.stringify({ email_ids: emailIds }),
  });
}

/**
 * Batch mark emails as done
 * - Updates Firestore: user_marked_done = true, visibility flags = false
 * - Updates Gmail: removes INBOX label (archives emails)
 * 
 * Automatically routes to:
 * - Direct Auth: /api/emails/batch/done
 * - Composio: /api/composio/emails/batch/done
 */
export async function batchMarkAsDone(emailIds: string[]): Promise<{
  status: string;
  message: string;
  success_count: number;
  failed_count: number;
  failed_ids: string[];
}> {
  return apiCall('/api/emails/batch/done', {
    method: 'POST',
    body: JSON.stringify({ email_ids: emailIds }),
  });
}

/**
 * Batch delete emails
 * - Updates Firestore: deleted = true, visibility flags = false
 * - Updates Gmail: adds TRASH label (moves to trash)
 * 
 * Automatically routes to:
 * - Direct Auth: /api/emails/batch
 * - Composio: /api/composio/emails/batch
 */
export async function batchDelete(emailIds: string[]): Promise<{
  status: string;
  message: string;
  success_count: number;
  failed_count: number;
  failed_ids: string[];
}> {
  return apiCall('/api/emails/batch', {
    method: 'DELETE',
    body: JSON.stringify({ email_ids: emailIds }),
  });
}

export interface SendEmailRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_html: string;
  body_text?: string;
  scheduled_at?: string | null;  // ISO string for Send Later
  tracking_enabled?: boolean;
  attachment_ids?: string[];  // S3 attachment IDs
}

export interface SendEmailResponse {
  status: 'queued' | 'scheduled';
  email_id: string;
  can_undo: boolean;
  undo_until: string | null;
  tracking_id: string | null;
}

export interface CancelEmailResponse {
  status: 'success';
  message: string;
  email_id: string;
}

export interface EmailStatus {
  id: string;
  status: 'queued' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
  to: string[];
  subject: string;
  created_at: string;
  sent_at: string | null;
  scheduled_at: string | null;
  gmail_message_id: string | null;
  gmail_thread_id: string | null;
  attempt_count: number;
  last_error: {
    type: string;
    message: string;
    timestamp: string;
  } | null;
  opened: boolean;
  open_count: number;
  first_opened_at: string | null;
  tracking_enabled: boolean;
}

export interface OutboxEmail {
  id: string;
  to: string[];
  subject: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  scheduled_at: string | null;
  opened: boolean;
  open_count: number;
}

export interface OutboxResponse {
  emails: OutboxEmail[];
  count: number;
}

export interface TrackingStats {
  tracking_enabled: boolean;
  opened: boolean;
  open_count: number;
  first_opened_at: string | null;
  opens: Array<{
    timestamp: string;
    country: string;
    device_type: string;
    device: string;
    os: string;
    email_client: string;
  }>;
  clicks: Array<{
    timestamp: string;
    url: string;
    country: string;
    device_type: string;
    email_client: string;
  }>;
  likely_read: boolean;
  accuracy_note: string;
}

// ======================================================
// EMAIL SEND FUNCTIONS
// ⚠️ TODO: Implement Composio backend endpoints for these
// ======================================================

/**
 * Send/Queue an email
 * - Saves to Firestore outbox
 * - Returns email_id for undo
 * - 8 second undo window
 * 
 * ⚠️ TODO: Composio endpoint not yet implemented
 */
export async function sendEmail(data: SendEmailRequest): Promise<SendEmailResponse> {
  return apiCall('/api/emails/send', {
    method: 'POST',
    body: JSON.stringify({
      to: data.to,
      cc: data.cc || [],
      bcc: data.bcc || [],
      subject: data.subject,
      body_html: data.body_html,
      body_text: data.body_text || '',
      scheduled_at: data.scheduled_at || null,
      tracking_enabled: data.tracking_enabled ?? true,
      attachment_ids: data.attachment_ids || []
    }),
  });
}

/**
 * Cancel/Undo an email before it's sent
 * - Only works within 8 second undo window
 * 
 * ⚠️ TODO: Composio endpoint not yet implemented
 */
export async function cancelEmail(emailId: string): Promise<CancelEmailResponse> {
  return apiCall(`/api/emails/${emailId}/cancel`, {
    method: 'DELETE',
  });
}

/**
 * Retry a failed email
 * 
 * ⚠️ TODO: Composio endpoint not yet implemented
 */
export async function retryEmail(emailId: string): Promise<{
  status: string;
  message: string;
  email_id: string;
}> {
  return apiCall(`/api/emails/${emailId}/retry`, {
    method: 'POST',
  });
}

/**
 * Get outbox (sent/queued/failed emails)
 * 
 * ⚠️ TODO: Composio endpoint not yet implemented
 */
export async function getOutbox(status?: string, limit: number = 50): Promise<OutboxResponse> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  params.append('limit', limit.toString());
  
  return apiCall(`/api/emails/outbox?${params}`, {
    method: 'GET',
  });
}

/**
 * Get email status
 * 
 * ⚠️ TODO: Composio endpoint not yet implemented
 */
export async function getEmailStatus(emailId: string): Promise<EmailStatus> {
  return apiCall(`/api/emails/${emailId}/status`, {
    method: 'GET',
  });
}

/**
 * Get email tracking stats
 * 
 * ⚠️ TODO: Composio endpoint not yet implemented
 */
export async function getEmailTracking(emailId: string): Promise<TrackingStats> {
  return apiCall(`/api/emails/${emailId}/tracking`, {
    method: 'GET',
  });
}