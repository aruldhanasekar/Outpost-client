// hooks/usePromises.ts - Fetch threads with promises
// v2.0: Added last_email_sender, last_email_snippet, is_read fields

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { Thread } from '../components/inbox/promiseTypes';

interface UsePromisesReturn {
  threads: Thread[];
  loading: boolean;
  error: string | null;
}

// Helper: Format date for grouping
function parseLastEmailDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  
  // Handle various date formats
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  return new Date(0);
}

export function usePromises(userId: string | undefined): UsePromisesReturn {
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
    
    const q = query(
      threadsRef,
      where('has_promise', '==', true),
      where('status', '==', 'active'),
      orderBy('updated_at', 'desc')
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
            // v2.0: New fields for proper display
            last_email_sender: data.last_email_sender || '',
            last_email_sender_email: data.last_email_sender_email || '',
            last_email_snippet: data.last_email_snippet || '',
            is_read: data.is_read !== undefined ? data.is_read : true,
          });
        });
        
        // Sort by last_email_date descending
        threadList.sort((a, b) => {
          const dateA = parseLastEmailDate(a.last_email_date);
          const dateB = parseLastEmailDate(b.last_email_date);
          return dateB.getTime() - dateA.getTime();
        });
        
        setThreads(threadList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching promise threads:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { threads, loading, error };
}