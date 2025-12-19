import { extractNameFromEmail } from '@/utils/formatters';

export interface Commitment {
  id: string;
  who_owes: string;
  owed_to: string;
  what: string;
  deadline: string | null;
  deadline_text: string | null;
  status: 'pending' | 'fulfilled' | 'cancelled';
  confidence: number;
  type: 'PROMISE' | 'AWAITING';
  trigger: string;
  detected_from_email: string;
  created_at: string;
}

export { extractNameFromEmail };

export interface Thread {
  thread_id: string;
  gmail_subject: string;
  ai_context_summary: string;
  ai_topic: string;
  ui_summary_promise: string;
  ui_summary_awaiting: string;
  has_promise: boolean;
  has_awaiting: boolean;
  commitments: Commitment[];
  email_ids: string[];
  participants: string[];
  status: 'active' | 'resolved';
  last_email_date: string;
  created_at: string;
  updated_at: string;
  
  // v2.0: Added fields for proper display in ThreadListItem
  last_email_sender: string;        // "Arul Dhanasekar" - proper name for display
  last_email_sender_email: string;  // "arul@domain.com" - email address
  last_email_snippet: string;       // "Send me the Q4 update..." - email preview
  
  // v2.1: Added is_read for unread indicator
  is_read: boolean;                 // false = show orange dot
  
  // Optional fields
  category?: string;
  email_count?: number;
}

// Helper: Calculate deadline status text
export function getDeadlineText(deadline: string | null): string {
  if (!deadline) return 'No deadline';
  
  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);
  
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    const overdue = Math.abs(diffDays);
    return overdue === 1 ? '1 day overdue' : `${overdue} days overdue`;
  } else if (diffDays === 0) {
    return 'Due today';
  } else if (diffDays === 1) {
    return '1 day left';
  } else {
    return `${diffDays} days left`;
  }
}

// Helper: Get primary PROMISE commitment from thread (first pending promise)
export function getPrimaryPromise(thread: Thread): Commitment | null {
  if (!thread.commitments || thread.commitments.length === 0) return null;
  
  // Find first pending promise
  const pending = thread.commitments.find(
    c => c.status === 'pending' && c.type === 'PROMISE'
  );
  
  return pending || thread.commitments.find(c => c.type === 'PROMISE') || null;
}

// Helper: Get primary AWAITING commitment from thread (first pending awaiting)
export function getPrimaryAwaiting(thread: Thread): Commitment | null {
  if (!thread.commitments || thread.commitments.length === 0) return null;
  
  // Find first pending awaiting
  const pending = thread.commitments.find(
    c => c.status === 'pending' && c.type === 'AWAITING'
  );
  
  return pending || thread.commitments.find(c => c.type === 'AWAITING') || null;
}

// Helper: Calculate waiting duration text for awaiting items
export function getWaitingDurationText(commitment: Commitment | null, thread: Thread): string {
  // If there's a deadline, show deadline status
  if (commitment?.deadline) {
    return getDeadlineText(commitment.deadline);
  }
  
  // No deadline - show how long we've been waiting
  const createdAt = commitment?.created_at || thread.created_at;
  if (createdAt) {
    const startDate = new Date(createdAt);
    const today = new Date();
    const diffTime = today.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Since today';
    } else if (diffDays === 1) {
      return 'Waiting 1 day';
    } else if (diffDays < 7) {
      return `Waiting ${diffDays} days`;
    } else if (diffDays < 14) {
      return 'Waiting 1 week';
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `Waiting ${weeks} weeks`;
    } else {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? 'Waiting 1 month' : `Waiting ${months} months`;
    }
  }
  
  return 'No deadline';
}