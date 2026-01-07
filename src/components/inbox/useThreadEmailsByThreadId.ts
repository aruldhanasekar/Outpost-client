// hooks/useThreadEmailsByThreadId.ts - Fetch all emails in a thread by thread_id
// v2.0: Real-time listener with onSnapshot
// v2.1: Fixed hasAttachment mapping to use Firestore field, added attachments array
// v2.2: Added to and message_id fields

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { Email } from '../inbox/types';
import { extractNameFromEmail, extractEmailAddress } from '@/utils/formatters';

interface UseThreadEmailsByThreadIdReturn {
  emails: Email[];
  loading: boolean;
  error: string | null;
}

// Firestore timestamp type
interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate: () => Date;
}

type DateValue = string | number | Date | FirestoreTimestamp | null | undefined;

// Helper: Get raw timestamp for sorting
function getTimestamp(internalDate: DateValue): number {
  if (internalDate === null || internalDate === undefined) return 0;
  
  if (internalDate && typeof internalDate === 'object' && 'toDate' in internalDate && typeof internalDate.toDate === 'function') {
    return internalDate.toDate().getTime();
  } else if (internalDate && typeof internalDate === 'object' && 'seconds' in internalDate) {
    return internalDate.seconds * 1000;
  } else if (typeof internalDate === 'string') {
    const parsed = parseInt(internalDate, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
    return new Date(internalDate).getTime() || 0;
  } else if (typeof internalDate === 'number') {
    return internalDate;
  } else if (internalDate instanceof Date) {
    return internalDate.getTime();
  }
  return 0;
}

// Helper: Format time for display
function formatTime(internalDate: DateValue): string {
  if (internalDate === null || internalDate === undefined) return '';
  
  const timestamp = getTimestamp(internalDate);
  if (timestamp === 0) return '';
  
  const emailDate = new Date(timestamp);
  if (isNaN(emailDate.getTime())) return '';

  return emailDate.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}

// Helper: Format full date
function formatDate(internalDate: DateValue): string {
  if (internalDate === null || internalDate === undefined) return '';
  
  const timestamp = getTimestamp(internalDate);
  if (timestamp === 0) return '';
  
  const emailDate = new Date(timestamp);
  if (isNaN(emailDate.getTime())) return '';

  return emailDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function useThreadEmailsByThreadId(
  userId: string | undefined,
  threadId: string | undefined
): UseThreadEmailsByThreadIdReturn {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !threadId) {
      setEmails([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const emailsRef = collection(db, 'users', userId, 'emails');
      
      // Query emails by thread_id, ordered by date (oldest first for conversation flow)
      const q = query(
        emailsRef,
        where('thread_id', '==', threadId),
        orderBy('internal_date', 'asc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const threadEmails: Email[] = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            const internalDate = data.internal_date || data.internalDate || data.date || data.received_at || null;
            
            threadEmails.push({
              id: doc.id,
              sender: extractNameFromEmail(data.from || ''),
              senderEmail: extractEmailAddress(data.from || ''),
              subject: data.subject || '(No Subject)',
              preview: data.snippet || '',
              body: data.body_html || data.body_plain || data.snippet || '',
              time: formatTime(internalDate),
              date: formatDate(internalDate),
              isRead: data.is_read !== false,
              // v2.1 FIX: Read hasAttachment directly from Firestore, not from gmail_labels
              hasAttachment: data.hasAttachment === true,
              // v2.1: Include attachments array from Firestore
              attachments: data.attachments || [],
              timestamp: getTimestamp(internalDate),
              // v2.2: Add to and message_id for participants and tracking
              to: data.to || [],
              message_id: data.message_id || null,
              // v2.6: Outpost user photos
              outpost_user_photo: data.outpost_user_photo || null,
              outpost_recipient_photo: data.outpost_recipient_photo || null,
            });
          });

          setEmails(threadEmails);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching thread emails:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up thread emails listener:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch thread emails');
      setLoading(false);
    }
  }, [userId, threadId]);

  return { emails, loading, error };
}