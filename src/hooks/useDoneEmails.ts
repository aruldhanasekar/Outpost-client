// hooks/useDoneEmails.ts - Fetch emails marked as done

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { Email } from '../components/inbox/types';

interface UseDoneEmailsReturn {
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

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  if (emailDate >= today) {
    return emailDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  } else if (emailDate >= yesterday) {
    return 'Yesterday';
  } else {
    return emailDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }
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

// Helper: Extract sender name from "from" field
function extractSenderName(from: string): string {
  if (!from) return 'Unknown';
  
  const match = from.match(/^([^<]+)</);
  if (match) return match[1].trim().replace(/"/g, '');
  const username = from.split('@')[0];
  return username.split(/[._-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
}

// Helper: Extract sender email
function extractSenderEmail(from: string): string {
  if (!from) return '';
  
  const match = from.match(/<(.+)>/);
  return match ? match[1] : from;
}

export function useDoneEmails(userId: string | undefined): UseDoneEmailsReturn {
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

    try {
      const emailsRef = collection(db, 'users', userId, 'emails');
      
      // Query done emails (not sent), ordered by internal_date descending (newest first)
      // Done emails = user_marked_done == true AND is_sent == false
      const q = query(
        emailsRef,
        where('user_marked_done', '==', true),
        where('is_sent', '==', false),
        orderBy('internal_date', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const doneEmails: Email[] = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            const internalDate = data.internal_date || data.internalDate || data.date || data.received_at || null;
            
            doneEmails.push({
              id: doc.id,
              sender: extractSenderName(data.from || ''),
              senderEmail: extractSenderEmail(data.from || ''),
              subject: data.subject || '(No Subject)',
              preview: data.snippet || '',
              body: data.body_html || data.body_plain || data.snippet || '',
              time: formatTime(internalDate),
              date: formatDate(internalDate),
              isRead: data.is_read !== false,
              hasAttachment: data.gmail_labels?.includes('ATTACHMENT') || false,
              timestamp: getTimestamp(internalDate),
              thread_id: data.thread_id || '',
            });
          });

          setEmails(doneEmails);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching done emails:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up done emails listener:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch done emails');
      setLoading(false);
    }
  }, [userId]);

  return { emails, loading, error };
}