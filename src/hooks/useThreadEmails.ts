// hooks/useThreadEmails.ts - Fetch all emails in a thread by email_ids
// v2.0: Added 'to' field for participants panel
// v2.1: Added 'message_id' for tracking lookup
// v2.2: Fixed hasAttachment to read from Firestore field, added attachments array

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { Email } from '../components/inbox/types';

interface UseThreadEmailsReturn {
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

// Helper: Extract sender name
function extractSenderName(from: string, fromName: string): string {
  if (fromName) return fromName;
  const match = from.match(/^([^<]+)</);
  if (match) return match[1].trim().replace(/"/g, '');
  return from.split('@')[0];
}

// Helper: Extract email address
function extractEmail(from: string): string {
  const match = from.match(/<(.+)>/);
  return match ? match[1] : from;
}

export function useThreadEmails(
  userId: string | undefined, 
  emailIds: string[]
): UseThreadEmailsReturn {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stringify emailIds for dependency comparison
  const emailIdsKey = JSON.stringify(emailIds);

  useEffect(() => {
    if (!userId || !emailIds || emailIds.length === 0) {
      setEmails([]);
      setLoading(false);
      return;
    }

    const fetchEmails = async () => {
      setLoading(true);
      setError(null);

      try {
        const emailsRef = collection(db, 'users', userId, 'emails');
        
        // Firestore 'in' query supports max 10 items, batch if needed
        const batches: string[][] = [];
        for (let i = 0; i < emailIds.length; i += 10) {
          batches.push(emailIds.slice(i, i + 10));
        }

        const allEmails: Email[] = [];

        for (const batch of batches) {
          const q = query(
            emailsRef,
            where('__name__', 'in', batch)
          );

          const snapshot = await getDocs(q);
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            const internalDate = data.internal_date || data.internalDate || data.date || data.received_at || null;
            
            allEmails.push({
              id: doc.id,
              sender: extractSenderName(data.from || '', data.from_name || ''),
              senderEmail: extractEmail(data.from || ''),
              subject: data.subject || '(No Subject)',
              preview: data.snippet || '',
              body: data.body_html || data.body_plain || data.snippet || '',
              time: formatTime(internalDate),
              date: formatDate(internalDate),
              isRead: data.is_read || false,
              // v2.2 FIX: Read hasAttachment directly from Firestore, not from gmail_labels
              hasAttachment: data.hasAttachment === true,
              // v2.2: Include attachments array from Firestore
              attachments: data.attachments || [],
              timestamp: getTimestamp(internalDate),
              // v2.0: Add recipients for participants panel
              to: data.to || [],
              // v2.1: Add Gmail message ID for tracking lookup
              message_id: data.message_id || null,
            });
          });
        }

        // Sort emails by timestamp ascending (oldest first for conversation view)
        allEmails.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        setEmails(allEmails);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching thread emails:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch emails');
        setLoading(false);
      }
    };

    fetchEmails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, emailIdsKey]);

  return { emails, loading, error };
}