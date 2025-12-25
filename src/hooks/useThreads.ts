// hooks/useThreads.ts - Fetch threads by category (URGENT, IMPORTANT, OTHERS)
// v2.0: Now fetches last_email_sender, last_email_snippet, last_email_sender_email for proper display

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase.config';

// Import Thread type from promiseTypes
import { Thread } from '@/components/inbox/promiseTypes';

// Re-export Thread for convenience
export type { Thread };

interface UseThreadsReturn {
  threads: Thread[];
  loading: boolean;
  error: string | null;
}

// Valid categories for this hook
type ThreadCategory = 'URGENT' | 'IMPORTANT' | 'OTHERS';

// Helper: Parse date for sorting
function parseLastEmailDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  return new Date(0);
}

export function useThreads(
  userId: string | undefined, 
  category: ThreadCategory
): UseThreadsReturn {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setThreads([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const threadsRef = collection(db, 'users', userId, 'threads');
    
    // Query threads by category and active status
    const q = query(
      threadsRef,
      where('category', '==', category),
      where('status', '==', 'active'),
      orderBy('last_email_date', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const threadList: Thread[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          threadList.push({
            thread_id: doc.id,
            gmail_subject: data.gmail_subject || '(No Subject)',
            ai_context_summary: data.ai_context_summary || '',
            ai_topic: data.ai_topic || '',
            ui_summary_promise: data.ui_summary_promise || '',
            ui_summary_awaiting: data.ui_summary_awaiting || '',
            has_promise: data.has_promise || false,
            has_awaiting: data.has_awaiting || false,
            commitments: data.commitments || [],
            email_ids: data.email_ids || [],
            participants: data.participants || [],
            status: data.status || 'active',
            last_email_date: data.last_email_date || '',
            created_at: data.created_at || '',
            updated_at: data.updated_at || '',
            
            // v2.0: NEW FIELDS for proper display
            last_email_sender: data.last_email_sender || '',
            last_email_sender_email: data.last_email_sender_email || '',
            last_email_snippet: data.last_email_snippet || '',
            
            // v2.1: Read state for unread indicator
            is_read: data.is_read !== undefined ? data.is_read : true,
            
            // Optional fields
            category: data.category || category,
            email_count: data.email_count || (data.email_ids?.length || 1),
            
            // Labels for auto-labeling display
            labels: data.labels || [],
          } as Thread);
        });
        
        // Sort by last_email_date descending (most recent first)
        threadList.sort((a, b) => {
          const dateA = parseLastEmailDate(a.last_email_date);
          const dateB = parseLastEmailDate(b.last_email_date);
          return dateB.getTime() - dateA.getTime();
        });
        
        setThreads(threadList);
        setLoading(false);
      },
      (err) => {
        console.error(`Error fetching ${category} threads:`, err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, category]);

  return { threads, loading, error };
}