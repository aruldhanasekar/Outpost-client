// hooks/useTrashedThreadEmails.ts - Fetch thread emails including deleted ones for Trash view

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { Email } from '@/components/inbox/types';

interface UseTrashedThreadEmailsReturn {
  emails: Email[];
  loading: boolean;
  error: string | null;
}

// Helper: Get raw timestamp for sorting
function getTimestamp(internalDate: unknown): number {
  if (internalDate === null || internalDate === undefined) return 0;
  
  if (internalDate instanceof Timestamp) {
    return internalDate.toDate().getTime();
  } else if (internalDate && typeof internalDate === 'object' && 'toDate' in internalDate && typeof (internalDate as { toDate: () => Date }).toDate === 'function') {
    return (internalDate as { toDate: () => Date }).toDate().getTime();
  } else if (internalDate && typeof internalDate === 'object' && 'seconds' in internalDate) {
    return (internalDate as { seconds: number }).seconds * 1000;
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
function formatTime(internalDate: unknown): string {
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
function formatDate(internalDate: unknown): string {
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
  return from.split('@')[0];
}

// Helper: Extract sender email
function extractSenderEmail(from: string): string {
  if (!from) return '';
  
  const match = from.match(/<(.+)>/);
  return match ? match[1] : from;
}

export function useTrashedThreadEmails(
  userId: string | undefined,
  threadId: string | undefined,
  selectedEmail: Email | null
): UseTrashedThreadEmailsReturn {
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
      
      // Query emails by thread_id (includes both deleted and non-deleted)
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
              thread_id: data.thread_id,
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
            });
          });

          // If no thread emails found, use the selected email itself
          if (threadEmails.length === 0 && selectedEmail) {
            setEmails([{
              id: selectedEmail.id,
              thread_id: selectedEmail.thread_id,
              sender: selectedEmail.sender,
              senderEmail: selectedEmail.senderEmail || '',
              subject: selectedEmail.subject,
              preview: selectedEmail.preview,
              body: selectedEmail.body || selectedEmail.preview,
              time: selectedEmail.time,
              date: selectedEmail.date,
              isRead: selectedEmail.isRead,
              hasAttachment: selectedEmail.hasAttachment,
            }]);
          } else {
            setEmails(threadEmails);
          }
          
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching trashed thread emails:', err);
          // On error, fall back to selected email
          if (selectedEmail) {
            setEmails([{
              id: selectedEmail.id,
              thread_id: selectedEmail.thread_id,
              sender: selectedEmail.sender,
              senderEmail: selectedEmail.senderEmail || '',
              subject: selectedEmail.subject,
              preview: selectedEmail.preview,
              body: selectedEmail.body || selectedEmail.preview,
              time: selectedEmail.time,
              date: selectedEmail.date,
              isRead: selectedEmail.isRead,
              hasAttachment: selectedEmail.hasAttachment,
            }]);
          }
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up trashed thread emails listener:', err);
      // On error, fall back to selected email
      if (selectedEmail) {
        setEmails([{
          id: selectedEmail.id,
          thread_id: selectedEmail.thread_id,
          sender: selectedEmail.sender,
          senderEmail: selectedEmail.senderEmail || '',
          subject: selectedEmail.subject,
          preview: selectedEmail.preview,
          body: selectedEmail.body || selectedEmail.preview,
          time: selectedEmail.time,
          date: selectedEmail.date,
          isRead: selectedEmail.isRead,
          hasAttachment: selectedEmail.hasAttachment,
        }]);
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch thread emails');
      setLoading(false);
    }
  }, [userId, threadId, selectedEmail]);

  return { emails, loading, error };
}