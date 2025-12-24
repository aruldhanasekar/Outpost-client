// searchApi.ts - Frontend API service for AI-powered email search
// Handles communication with the backend search endpoint

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

// Search result interface matching backend response
export interface SearchResult {
  id: string;
  thread_id: string;
  subject: string;
  sender: string;
  sender_email: string;
  recipients: string[];
  cc?: string[];
  bcc?: string[];
  date: string;
  snippet: string;
  body_preview?: string;
  body_html?: string;
  body_text?: string;
  category: 'URGENT' | 'IMPORTANT' | 'PROMISES' | 'AWAITING' | 'OTHERS';
  source: 'inbox' | 'sent' | 'done' | 'trash' | 'drafts';
  has_attachment: boolean;
  is_read: boolean;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url?: string;
}

export interface SearchRequest {
  query: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total_results: number;
  query: string;
  search_time_ms: number;
}

/**
 * Search emails using AI-powered natural language search
 * 
 * @param query - Natural language query or Gmail-style operators
 * @param token - Firebase ID token for authentication
 * @returns Array of matching emails with full content
 */
export async function searchEmails(
  query: string,
  token: string
): Promise<SearchResult[]> {
  try {
    const response = await fetch(`${API_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Search failed (${response.status})`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    const data: SearchResponse = await response.json();
    
    console.log(`✅ Search completed: ${data.total_results} results in ${data.search_time_ms}ms`);
    
    return data.results;
  } catch (error) {
    console.error('❌ Search API error:', error);
    throw error;
  }
}

/**
 * Get search suggestions based on partial query
 * (Optional - for future autocomplete feature)
 */
export async function getSearchSuggestions(
  partialQuery: string,
  token: string
): Promise<string[]> {
  try {
    const response = await fetch(`${API_URL}/api/search/suggestions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ query: partialQuery })
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.suggestions || [];
  } catch (error) {
    console.error('Search suggestions error:', error);
    return [];
  }
}

/**
 * Get recent searches for the user
 * (Optional - for future search history feature)
 */
export async function getRecentSearches(
  token: string
): Promise<string[]> {
  try {
    const response = await fetch(`${API_URL}/api/search/recent`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true'
      }
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.searches || [];
  } catch (error) {
    console.error('Recent searches error:', error);
    return [];
  }
}

export default {
  searchEmails,
  getSearchSuggestions,
  getRecentSearches
};