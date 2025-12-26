// services/emailApi.ts - API calls for email actions
// ✅ Automatic endpoint routing based on auth_method
// ✅ Composio endpoints implemented for all functions
// ✅ Label API functions added
// ✅ Contacts API function added
// ✅ Fixed: localStorage fallback for auth method detection
// ✅ Added: getLabelByName and getLabelThreads for Label page

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

// Get auth method - check claims first, fallback to localStorage
async function getAuthMethod(): Promise<'direct' | 'composio'> {
  const user = auth.currentUser;
  if (!user) return 'direct';
  
  try {
    // Check custom claims first
    const idTokenResult = await user.getIdTokenResult();
    const claimsAuthMethod = idTokenResult.claims.auth_method as string;
    
    if (claimsAuthMethod === 'composio') {
      return 'composio';
    }
    
    // Fallback: Check localStorage (set after Composio finalization)
    const storedAuthMethod = localStorage.getItem('outpost_auth_method');
    if (storedAuthMethod === 'composio') {
      console.log('🔄 Auth method from localStorage: composio (claims not yet propagated)');
      // Force token refresh to get updated claims
      await user.getIdToken(true);
      return 'composio';
    }
    
    return 'direct';
  } catch (error) {
    console.error('Failed to get auth method:', error);
    
    // Last resort fallback to localStorage
    const storedAuthMethod = localStorage.getItem('outpost_auth_method');
    if (storedAuthMethod === 'composio') {
      return 'composio';
    }
    
    return 'direct';
  }
}

// Helper for API calls with automatic endpoint routing
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  const authMethod = await getAuthMethod();
  
  // Route: Replace /api/emails and /api/labels with correct prefix based on auth method
  let routedEndpoint = endpoint;
  if (authMethod === 'composio') {
    if (endpoint.startsWith('/api/emails')) {
      routedEndpoint = endpoint.replace('/api/emails', '/api/composio/emails');
      console.log(`🔀 Routing to Composio: ${endpoint} → ${routedEndpoint}`);
    } else if (endpoint.startsWith('/api/labels')) {
      routedEndpoint = endpoint.replace('/api/labels', '/api/composio/labels');
      console.log(`🔀 Routing to Composio: ${endpoint} → ${routedEndpoint}`);
    }
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
// AUTH METHOD HELPERS (for use in Composio finalization)
// ======================================================

/**
 * Set auth method in localStorage after Composio finalization.
 * Call this after successful /auth/composio/finalize response.
 */
export function setAuthMethodComposio(): void {
  localStorage.setItem('outpost_auth_method', 'composio');
  console.log('✅ Auth method set to composio in localStorage');
}

/**
 * Clear auth method from localStorage (on logout).
 */
export function clearAuthMethod(): void {
  localStorage.removeItem('outpost_auth_method');
  console.log('🧹 Auth method cleared from localStorage');
}

/**
 * Force refresh the Firebase ID token to get updated custom claims.
 * Call this after Composio finalization.
 */
export async function refreshAuthToken(): Promise<void> {
  const user = auth.currentUser;
  if (user) {
    await user.getIdToken(true);
    console.log('🔄 Firebase token refreshed');
  }
}

// ======================================================
// EMAIL API FUNCTIONS
// Automatic routing handles Direct Auth vs Composio
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

/**
 * Get single email by ID
 * - Fetches email from Firestore
 * - Used for reply/forward from context menu
 * 
 * Automatically routes to:
 * - Direct Auth: /api/emails/{emailId}
 * - Composio: /api/composio/emails/{emailId}
 */
export async function getEmail(emailId: string): Promise<{
  id: string;
  thread_id: string;
  message_id: string;
  subject: string;
  sender_name: string;
  sender_email: string;
  from: string;
  to: string[];
  cc: string[];
  date: string;
  snippet: string;
  body_html: string;
  body_text: string;
  is_read: boolean;
  hasAttachment: boolean;
  attachments: unknown[];
}> {
  return apiCall(`/api/emails/${emailId}`, {
    method: 'GET',
  });
}

/**
 * Get contacts (unique email addresses from inbox)
 * - Used for auto-label email suggestions
 * 
 * Automatically routes to:
 * - Direct Auth: /api/emails/contacts
 * - Composio: /api/composio/emails/contacts
 */
export async function getContacts(): Promise<{
  emails: string[];
  count: number;
}> {
  return apiCall('/api/emails/contacts', {
    method: 'GET',
  });
}

// ======================================================
// BATCH OPERATIONS
// Automatic routing handles Direct Auth vs Composio
// ======================================================

/**
 * Batch mark emails as read
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
  threads_updated?: number;
}> {
  return apiCall('/api/emails/batch/done', {
    method: 'POST',
    body: JSON.stringify({ email_ids: emailIds }),
  });
}

/**
 * Batch delete emails
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
  threads_updated?: number;
}> {
  return apiCall('/api/emails/batch', {
    method: 'DELETE',
    body: JSON.stringify({ email_ids: emailIds }),
  });
}

// ======================================================
// REPLY/FORWARD FUNCTIONS
// ======================================================

/**
 * Reply to an email
 * 
 * Automatically routes to:
 * - Direct Auth: /api/emails/reply
 * - Composio: /api/composio/emails/reply
 */
export async function replyToEmail(data: {
  thread_id: string;
  in_reply_to?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_html: string;
  body_text?: string;
  scheduled_at?: string | null;
  tracking_enabled?: boolean;
  attachment_ids?: string[];
}): Promise<{
  status: string;
  message: string;
  email_id: string;
  thread_id: string;
}> {
  return apiCall('/api/emails/reply', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Forward an email
 * 
 * Automatically routes to:
 * - Direct Auth: /api/emails/forward
 * - Composio: /api/composio/emails/forward
 */
export async function forwardEmail(data: {
  thread_id: string;
  original_message_id?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_html: string;
  body_text?: string;
  scheduled_at?: string | null;
  tracking_enabled?: boolean;
  attachment_ids?: string[];
}): Promise<{
  status: string;
  message: string;
  email_id: string;
  thread_id: string;
}> {
  return apiCall('/api/emails/forward', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ======================================================
// TYPE DEFINITIONS
// ======================================================

export interface SendEmailRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_html: string;
  body_text?: string;
  scheduled_at?: string | null;
  tracking_enabled?: boolean;
  attachment_ids?: string[];
}

export interface SendEmailResponse {
  status: string;
  message: string;
  email_id: string;
  scheduled_at?: string;
  can_undo: boolean;
  undo_until?: string;
}

export interface CancelEmailResponse {
  status: string;
  message: string;
  email_id: string;
  was_sent: boolean;
}

export interface OutboxEmail {
  id: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  snippet: string;
  status: 'queued' | 'sending' | 'sent' | 'failed' | 'cancelled';
  created_at: string;
  scheduled_at?: string;
  sent_at?: string;
  error?: string;
  tracking_enabled?: boolean;
}

export interface OutboxResponse {
  status: string;
  emails: OutboxEmail[];
  total: number;
}

export interface EmailStatus {
  id: string;
  status: 'queued' | 'sending' | 'sent' | 'failed' | 'cancelled';
  created_at: string;
  scheduled_at?: string;
  sent_at?: string;
  error?: string;
  can_undo: boolean;
  undo_until?: string;
}

export interface TrackingStats {
  email_id: string;
  tracking_enabled: boolean;
  opens: number;
  last_opened?: string;
  clicks: number;
  clicked_links?: { url: string; count: number; last_clicked: string }[];
}

export interface Label {
  id: string;
  name: string;
  display_name: string;
  color: string;
  message_count?: number;
  threads_count?: number;
}

export interface LabelListResponse {
  status: string;
  labels: Label[];
  total: number;
}

// ======================================================
// EMAIL SEND FUNCTIONS
// ✅ Composio endpoints implemented
// ======================================================

/**
 * Send/Queue an email
 * - Saves to Firestore outbox
 * - Returns email_id for undo
 * - 8 second undo window
 * 
 * Automatically routes to:
 * - Direct Auth: /api/emails/send
 * - Composio: /api/composio/emails/send
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
 * Automatically routes to:
 * - Direct Auth: /api/emails/{emailId}/cancel
 * - Composio: /api/composio/emails/{emailId}/cancel
 */
export async function cancelEmail(emailId: string): Promise<CancelEmailResponse> {
  return apiCall(`/api/emails/${emailId}/cancel`, {
    method: 'DELETE',
  });
}

/**
 * Retry a failed email
 * 
 * Automatically routes to:
 * - Direct Auth: /api/emails/{emailId}/retry
 * - Composio: /api/composio/emails/{emailId}/retry
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
 * Automatically routes to:
 * - Direct Auth: /api/emails/outbox
 * - Composio: /api/composio/emails/outbox
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
 * Automatically routes to:
 * - Direct Auth: /api/emails/{emailId}/status
 * - Composio: /api/composio/emails/{emailId}/status
 */
export async function getEmailStatus(emailId: string): Promise<EmailStatus> {
  return apiCall(`/api/emails/${emailId}/status`, {
    method: 'GET',
  });
}

/**
 * Get email tracking stats
 * 
 * Automatically routes to:
 * - Direct Auth: /api/emails/{emailId}/tracking
 * - Composio: /api/composio/emails/{emailId}/tracking
 */
export async function getEmailTracking(emailId: string): Promise<TrackingStats> {
  return apiCall(`/api/emails/${emailId}/tracking`, {
    method: 'GET',
  });
}

// ======================================================
// LABEL API FUNCTIONS
// ✅ Automatic routing handles Direct Auth vs Composio
// ======================================================

/**
 * Get all user labels
 * 
 * Automatically routes to:
 * - Direct Auth: /api/labels
 * - Composio: /api/composio/labels
 */
export async function getLabels(): Promise<LabelListResponse> {
  return apiCall('/api/labels', {
    method: 'GET',
  });
}

/**
 * Create a new label
 * 
 * Automatically routes to:
 * - Direct Auth: /api/labels/create
 * - Composio: /api/composio/labels/create
 */
export async function createLabel(data: {
  name: string;
  auto_label?: boolean;
  auto_label_emails?: string[];
}): Promise<{
  status: string;
  label_id: string;
  label_name: string;
  gmail_label_name?: string;
  color: string;
  auto_label?: boolean;
  auto_label_emails?: string[];
}> {
  return apiCall('/api/labels/create', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Apply label to thread
 * 
 * Automatically routes to:
 * - Direct Auth: /api/labels/apply-to-thread
 * - Composio: /api/composio/labels/apply-to-thread
 */
export async function applyLabelToThread(data: {
  thread_id: string;
  label_id: string;
  label_name: string;
}): Promise<{
  status: string;
  message: string;
}> {
  return apiCall('/api/labels/apply-to-thread', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Remove label from thread
 * 
 * Automatically routes to:
 * - Direct Auth: /api/labels/remove-from-thread
 * - Composio: /api/composio/labels/remove-from-thread
 */
export async function removeLabelFromThread(data: {
  thread_id: string;
  label_id: string;
  label_name: string;
}): Promise<{
  status: string;
  message: string;
}> {
  return apiCall('/api/labels/remove-from-thread', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update label
 * 
 * Automatically routes to:
 * - Direct Auth: /api/labels/{labelId}
 * - Composio: /api/composio/labels/{labelId}
 */
export async function updateLabel(labelId: string, data: {
  name?: string;
  auto_label?: boolean;
  auto_label_emails?: string[];
}): Promise<{
  status: string;
  label_id: string;
  updated: Record<string, unknown>;
}> {
  return apiCall(`/api/labels/${labelId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete label
 * 
 * Automatically routes to:
 * - Direct Auth: /api/labels/{labelId}
 * - Composio: /api/composio/labels/{labelId}
 */
export async function deleteLabel(labelId: string): Promise<{
  status: string;
  label_id: string;
  message: string;
}> {
  return apiCall(`/api/labels/${labelId}`, {
    method: 'DELETE',
  });
}

/**
 * Get label details by ID
 * 
 * Automatically routes to:
 * - Direct Auth: /api/labels/{labelId}/details
 * - Composio: /api/composio/labels/{labelId}/details
 */
export async function getLabelDetails(labelId: string): Promise<{
  id: string;
  name: string;
  display_name: string;
  gmail_label_id?: string;
  auto_label: boolean;
  auto_label_emails: string[];
  color: string;
}> {
  return apiCall(`/api/labels/${labelId}/details`, {
    method: 'GET',
  });
}

/**
 * Get label by name
 * Used by Label page to get label info
 * 
 * Automatically routes to:
 * - Direct Auth: /api/labels/by-name/{labelName}
 * - Composio: /api/composio/labels/by-name/{labelName}
 */
export async function getLabelByName(labelName: string): Promise<{
  id: string;
  name: string;
  display_name: string;
  gmail_label_id?: string;
  auto_label: boolean;
  auto_label_emails: string[];
  color: string;
}> {
  return apiCall(`/api/labels/by-name/${encodeURIComponent(labelName)}`, {
    method: 'GET',
  });
}

/**
 * Get threads by label name
 * Used by Label page to display threads with a specific label
 * 
 * Automatically routes to:
 * - Direct Auth: /api/labels/{labelName}/threads
 * - Composio: /api/composio/labels/{labelName}/threads
 */
export async function getLabelThreads(labelName: string): Promise<{
  status: string;
  threads: Array<{
    thread_id: string;
    gmail_subject: string;
    last_email_date: string;
    last_email_sender: string;
    last_email_sender_email: string;
    last_email_snippet: string;
    email_count: number;
    is_read: boolean;
    status: string;
    category: string;
    labels: Array<{ id: string; name: string; color?: string }>;
  }>;
  total: number;
  label_name: string;
  label_id: string;
  label_color: string;
}> {
  return apiCall(`/api/labels/${encodeURIComponent(labelName)}/threads`, {
    method: 'GET',
  });
}

/**
 * Search emails
 * 
 * Automatically routes to:
 * - Direct Auth: /api/labels/search
 * - Composio: /api/composio/labels/search
 */
export async function searchEmails(query: string, maxResults: number = 20): Promise<{
  status: string;
  emails: Array<{
    id: string;
    thread_id: string;
    subject: string;
    sender_name: string;
    sender_email: string;
    snippet: string;
    date: string;
    is_read: boolean;
    has_attachment: boolean;
    category: string;
  }>;
  total: number;
  query: string;
}> {
  const params = new URLSearchParams();
  params.append('q', query);
  params.append('max_results', maxResults.toString());
  
  return apiCall(`/api/labels/search?${params}`, {
    method: 'GET',
  });
}