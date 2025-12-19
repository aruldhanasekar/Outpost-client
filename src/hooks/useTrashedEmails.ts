// hooks/useTrashedEmails.ts - Fetch deleted/trashed emails from Firestore

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { Email } from '@/components/inbox/types';

interface UseTrashedEmailsResult {
  emails: Email[];
  loading: boolean;
  error: string | null;
}

export function useTrashedEmails(userId: string | undefined): UseTrashedEmailsResult {
  const [emails, setEmails] = useState<Email[]>([]);
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

    // Query: deleted == true, ordered by deleted_at desc
    const emailsRef = collection(db, 'users', userId, 'emails');
    const q = query(
      emailsRef,
      where('deleted', '==', true),
      orderBy('deleted_at', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const emailList: Email[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          
          // Format time for display - handle both Firestore Timestamp and number
          let timeDisplay = '';
          let dateDisplay = '';
          
          // Get the date - could be Firestore Timestamp, number (ms), or string
          let emailDate: Date | null = null;
          
          if (data.internal_date) {
            if (data.internal_date instanceof Timestamp) {
              emailDate = data.internal_date.toDate();
            } else if (typeof data.internal_date === 'number') {
              emailDate = new Date(data.internal_date);
            } else if (data.internal_date?.seconds) {
              // Firestore Timestamp object format
              emailDate = new Date(data.internal_date.seconds * 1000);
            } else if (typeof data.internal_date === 'string') {
              emailDate = new Date(data.internal_date);
            }
          }
          
          if (emailDate && !isNaN(emailDate.getTime())) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
            
            if (emailDate >= today) {
              timeDisplay = emailDate.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              });
            } else if (emailDate >= yesterday) {
              timeDisplay = 'Yesterday';
            } else {
              timeDisplay = emailDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              });
            }
            
            dateDisplay = emailDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
          }

          return {
            id: doc.id,
            thread_id: data.thread_id || doc.id, // Include thread_id for thread loading
            sender: data.sender_name || data.from?.split('<')[0]?.trim() || 'Unknown',
            senderEmail: data.from?.match(/<(.+)>/)?.[1] || data.from || '',
            subject: data.subject || '(No subject)',
            preview: data.snippet || '',
            body: data.body || data.snippet || '',
            time: timeDisplay,
            date: dateDisplay,
            isRead: data.is_read || false,
            hasAttachment: data.has_attachment || false,
            to: data.to || '',
            category: data.category || 'OTHER',
          };
        });

        setEmails(emailList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching trashed emails:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { emails, loading, error };
}