// src/services/trackingApi.ts
// API service for fetching email tracking statistics
// UPDATED: Added recipient_open_count and other new fields

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

// ======================================================
// TYPES
// ======================================================

export interface OpenEvent {
  timestamp: string;
  country?: string;
  device_type?: string;
  device?: string;
  os?: string;
  email_client?: string;
}

export interface ClickEvent {
  timestamp: string;
  url?: string;
  country?: string;
  device_type?: string;
  email_client?: string;
}

export interface TrackingStats {
  email_id: string;
  tracking_enabled: boolean;
  
  // Core tracking status
  opened: boolean;
  recipient_open_count: number;  // NEW: Only recipient opens (excludes sender self-views)
  open_count: number;            // Alias for backwards compatibility
  click_count: number;           // NEW: Number of link clicks
  
  // Timestamps
  first_opened_at: string | null;
  last_opened_at: string | null;  // NEW: Most recent open
  sent_at: string | null;
  
  // Email metadata
  to: string[];
  subject: string;
  status: 'queued' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
  
  // Detailed events (when include_events=true)
  recipient_opens?: OpenEvent[];
  clicks?: ClickEvent[];
  
  // Debug info
  sender_view_count?: number;  // NEW: How many times sender viewed their own email
  
  // Accuracy disclaimer
  accuracy_note?: string;
}

export interface TrackingStatsSummary {
  email_id: string;
  opened: boolean;
  recipient_open_count: number;
  click_count: number;
  first_opened_at: string | null;
  last_opened_at: string | null;
  subject: string;
  to: string[];
}

export interface ThreadTrackingStats {
  thread_id: string;
  total_emails: number;
  opened_count: number;           // How many emails in thread were opened
  total_recipient_opens: number;  // Sum of all recipient opens
  total_clicks: number;
  first_opened_at: string | null;
  last_opened_at: string | null;
  emails: TrackingStatsSummary[];
}

export interface TrackingSummary {
  total_sent: number;
  total_opened: number;
  total_recipient_opens: number;
  total_clicks: number;
  open_rate: number;
  click_rate: number;
  accuracy_note: string;
}

// ======================================================
// HELPER: Get Auth Headers
// ======================================================
const getAuthHeaders = async (): Promise<Headers> => {
  const { auth } = await import('../firebase.config');
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const token = await user.getIdToken();
  
  const headers = new Headers();
  headers.append('Authorization', `Bearer ${token}`);
  headers.append('Content-Type', 'application/json');
  
  return headers;
};

// ======================================================
// API: Get Tracking by Gmail Message ID
// ======================================================
export const getTrackingByMessageId = async (
  gmailMessageId: string,
  includeEvents: boolean = false
): Promise<TrackingStats | null> => {
  try {
    const headers = await getAuthHeaders();
    const params = includeEvents ? '?include_events=true' : '';
    
    const response = await fetch(
      `${API_BASE_URL}/api/emails/tracking/by-message/${gmailMessageId}${params}`,
      {
        method: 'GET',
        headers
      }
    );
    
    if (response.status === 404) {
      return null; // No tracking found for this email
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    
    // Normalize response - ensure recipient_open_count exists
    return {
      ...data,
      recipient_open_count: data.recipient_open_count ?? data.open_count ?? 0,
      open_count: data.recipient_open_count ?? data.open_count ?? 0,
      click_count: data.click_count ?? 0,
      sender_view_count: data.sender_view_count ?? 0
    };
  } catch (error) {
    console.error('Failed to fetch tracking:', error);
    return null;
  }
};

// ======================================================
// API: Get Tracking by Thread ID
// ======================================================
export const getTrackingByThreadId = async (threadId: string): Promise<ThreadTrackingStats | null> => {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(
      `${API_BASE_URL}/api/emails/tracking/by-thread/${threadId}`,
      {
        method: 'GET',
        headers
      }
    );
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Failed to fetch thread tracking:', error);
    return null;
  }
};

// ======================================================
// API: Get Tracking by Email Document ID
// ======================================================
export const getTrackingByEmailId = async (
  emailId: string,
  includeEvents: boolean = true
): Promise<TrackingStats | null> => {
  try {
    const headers = await getAuthHeaders();
    const params = includeEvents ? '?include_events=true' : '';
    
    const response = await fetch(
      `${API_BASE_URL}/api/emails/tracking/${emailId}${params}`,
      {
        method: 'GET',
        headers
      }
    );
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      ...data,
      recipient_open_count: data.recipient_open_count ?? data.open_count ?? 0,
      open_count: data.recipient_open_count ?? data.open_count ?? 0
    };
  } catch (error) {
    console.error('Failed to fetch tracking:', error);
    return null;
  }
};

// ======================================================
// API: Get All Tracking Stats (with pagination)
// ======================================================
export const getAllTrackingStats = async (
  options: {
    limit?: number;
    offset?: number;
    openedOnly?: boolean;
  } = {}
): Promise<TrackingStatsSummary[]> => {
  try {
    const headers = await getAuthHeaders();
    
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());
    if (options.openedOnly) params.set('opened_only', 'true');
    
    const query = params.toString() ? `?${params.toString()}` : '';
    
    const response = await fetch(
      `${API_BASE_URL}/api/emails/tracking/${query}`,
      {
        method: 'GET',
        headers
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Failed to fetch all tracking stats:', error);
    return [];
  }
};

// ======================================================
// API: Get Overall Tracking Summary
// ======================================================
export const getTrackingSummary = async (): Promise<TrackingSummary | null> => {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(
      `${API_BASE_URL}/api/emails/tracking/stats/summary`,
      {
        method: 'GET',
        headers
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Failed to fetch tracking summary:', error);
    return null;
  }
};

// ======================================================
// API: Lookup by Tracking ID (for debugging)
// ======================================================
export const lookupByTrackingId = async (trackingId: string): Promise<TrackingStats | null> => {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(
      `${API_BASE_URL}/api/emails/tracking/lookup/${trackingId}`,
      {
        method: 'GET',
        headers
      }
    );
    
    if (response.status === 404 || response.status === 403) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Failed to lookup tracking:', error);
    return null;
  }
};