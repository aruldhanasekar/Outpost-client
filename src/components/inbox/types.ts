// types.ts - EXACT match of original Inbox.tsx
// v2.0: Added 'to' field for participants panel
// v2.1: Added CategoryCounts for unread badges
// v2.2: Added message_id for email tracking in inbox threads
// v2.3: Added Attachment interface and attachments field for email attachments
// v2.4: Added user_category fields for manual category override
// v2.5: Added sender_photo_url for sender profile photos

// Category type
export type Category = "urgent" | "important" | "promises" | "awaiting" | "others";

// Unread counts for each category
export interface CategoryCounts {
  urgent: number;
  important: number;
  promises: number;
  awaiting: number;
  others: number;
}

export const categories: { id: Category; label: string }[] = [
  { id: "urgent", label: "Urgent" },
  { id: "important", label: "Important" },
  { id: "promises", label: "Promises" },
  { id: "awaiting", label: "Awaiting" },
  { id: "others", label: "Others" },
];

// v2.3: Attachment interface for email attachments
export interface Attachment {
  id: string;
  filename: string;
  content_type: string;
  size: number;
  storage_path?: string;
  url?: string;
}

// Sample email type
export interface Email {
  id: string;
  sender: string;
  senderEmail: string;
  subject: string;
  preview: string;
  body: string;
  time: string;
  date: string;
  isRead: boolean;
  hasAttachment: boolean;
  attachments?: Attachment[];  // v2.3: Attachment data array
  timestamp?: number; // Optional: for sorting in thread view
  thread_id?: string; // Optional: Gmail thread ID for thread view
  to?: string[];      // v2.0: Recipients for participants panel
  message_id?: string; // v2.2: Gmail message ID for tracking lookup
  // v2.4: Category override fields
  user_category?: string;      // User override category (URGENT/IMPORTANT/OTHERS)
  user_category_at?: string;   // When user changed it
  category_source?: string;    // 'ai' | 'user' | 'sender_rule'
  outpost_user_photo?: string | null;
  outpost_recipient_photo?: string | null;
}

// Tracking status for sent emails within inbox threads
export interface TrackingStatus {
  opened: boolean;
  recipient_open_count: number;
  first_opened_at: string | null;
  last_opened_at: string | null;
  click_count: number;
}