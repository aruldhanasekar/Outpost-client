// hooks/useSpamEmails.ts
// Hook to fetch spam emails from Firestore spam_emails collection
// v1.0: Initial implementation

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/firebase.config';

// Spam email interface matching the spam_emails collection schema
export interface SpamEmail {
  id: string;
  message_id: string;
  thread_id: string;
  subject: string;
  snippet: string;
  from: string;
  from_name: string;
  senderEmail: string;
  to: string[];
  cc: string[];
  date: string;
  internal_date: string;
  body_plain: string;
  body_html: string;
  gmail_labels: string[];
  hasAttachment: boolean;
  attachments: Array<{ filename?: string; name?: string; mimeType?: string; size?: number }>;
  is_read: boolean;
  is_sent: boolean;
  is_spam: boolean;
  category: string;
  created_at: string;
  updated_at: string;
}

interface UseSpamEmailsResult {
  emails: SpamEmail[];
  loading: boolean;
  error: string | null;
}

export function useSpamEmails(userId: string | undefined): UseSpamEmailsResult {
  const [emails, setEmails] = useState<SpamEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setEmails([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Query spam_emails collection (separate from regular emails)
    const spamRef = collection(db, 'users', userId, 'spam_emails');
    const q = query(
      spamRef,
      orderBy('internal_date', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const spamEmails: SpamEmail[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            message_id: data.message_id || doc.id,
            thread_id: data.thread_id || doc.id,
            subject: data.subject || '(No Subject)',
            snippet: data.snippet || '',
            from: data.from || '',
            from_name: data.from_name || '',
            senderEmail: data.senderEmail || '',
            to: data.to || [],
            cc: data.cc || [],
            date: data.date || '',
            internal_date: data.internal_date || '',
            body_plain: data.body_plain || '',
            body_html: data.body_html || '',
            gmail_labels: data.gmail_labels || [],
            hasAttachment: data.hasAttachment || false,
            attachments: data.attachments || [],
            is_read: data.is_read ?? true,
            is_sent: false,
            is_spam: true,
            category: 'SPAM',
            created_at: data.created_at || '',
            updated_at: data.updated_at || '',
          };
        });

        setEmails(spamEmails);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching spam emails:', err);
        setError('Failed to load spam emails');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { emails, loading, error };
}

export default useSpamEmails;