// hooks/useScheduledEmails.ts
// Real-time hook for scheduled emails in outbox
// Provides live updates when emails are scheduled, sent, or cancelled

import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/firebase.config';

// Scheduled email interface
export interface ScheduledEmail {
  id: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_html: string;
  body_text?: string;
  scheduled_at: string;
  created_at: string;
  updated_at?: string;
  status: 'scheduled' | 'sent' | 'cancelled' | 'failed';
  type?: 'reply' | 'forward' | null;
  thread_id?: string;
  thread_subject?: string;
  auth_method?: 'direct' | 'composio';
  attachments?: Array<{
    filename: string;
    content_type: string;
    size: number;
  }>;
}

interface UseScheduledEmailsReturn {
  emails: ScheduledEmail[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useScheduledEmails(userId: string | undefined): UseScheduledEmailsReturn {
  const [emails, setEmails] = useState<ScheduledEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Manual refresh function
  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setEmails([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create query for scheduled emails
      const outboxRef = collection(db, 'users', userId, 'outbox');
      const scheduledQuery = query(
        outboxRef,
        where('status', '==', 'scheduled'),
        orderBy('scheduled_at', 'asc')
      );

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        scheduledQuery,
        (snapshot) => {
          const scheduledEmails: ScheduledEmail[] = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            scheduledEmails.push({
              id: doc.id,
              to: data.to || [],
              cc: data.cc || [],
              bcc: data.bcc || [],
              subject: data.subject || '(No Subject)',
              body_html: data.body_html || '',
              body_text: data.body_text || '',
              scheduled_at: data.scheduled_at || '',
              created_at: data.created_at || '',
              updated_at: data.updated_at || '',
              status: data.status || 'scheduled',
              type: data.type || null,
              thread_id: data.thread_id || '',
              thread_subject: data.thread_subject || '',
              auth_method: data.auth_method || 'direct',
              attachments: data.attachments || []
            });
          });

          setEmails(scheduledEmails);
          setLoading(false);
          setError(null);
          
          console.log(`📅 Scheduled emails updated: ${scheduledEmails.length} emails`);
        },
        (err) => {
          console.error('❌ Error fetching scheduled emails:', err);
          setError(err.message || 'Failed to fetch scheduled emails');
          setLoading(false);
        }
      );

      // Cleanup listener on unmount
      return () => {
        console.log('🔌 Unsubscribing from scheduled emails listener');
        unsubscribe();
      };
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set up listener';
      console.error('❌ Error setting up scheduled emails listener:', err);
      setError(errorMessage);
      setLoading(false);
    }
  }, [userId, refreshTrigger]);

  return { emails, loading, error, refresh };
}

// Helper function to format scheduled time
export function formatScheduledTime(isoString: string): string {
  if (!isoString) return '';
  
  try {
    const date = new Date(isoString);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    if (isToday) {
      return `Today at ${timeStr}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${timeStr}`;
    } else {
      const dateStr = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      return `${dateStr} at ${timeStr}`;
    }
  } catch {
    return isoString;
  }
}

// Helper function to get time until send
export function getTimeUntilSend(isoString: string): string {
  if (!isoString) return '';
  
  try {
    const scheduled = new Date(isoString);
    const now = new Date();
    const diff = scheduled.getTime() - now.getTime();
    
    if (diff <= 0) {
      return 'Sending soon...';
    }
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) {
      return `in ${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `in ${minutes} min${minutes > 1 ? 's' : ''}`;
    } else {
      return 'in less than a minute';
    }
  } catch {
    return '';
  }
}