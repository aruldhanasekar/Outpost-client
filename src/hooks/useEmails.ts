// hooks/useEmails.ts - Real-time Firestore subscription
// FIXED: Query by visible_in_* flags instead of is_read
// v2.0: Fixed hasAttachment to read from Firestore field, added attachments array

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, Query, DocumentData } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { Email, Category } from '../components/inbox/types';

interface UseEmailsReturn {
  emails: Email[];
  loading: boolean;
  error: string | null;
}

// Helper: Format time for display
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatTime(internalDate: any): string {
  if (internalDate === null || internalDate === undefined) return '';
  
  let emailDate: Date;
  
  // Handle Firestore Timestamp object
  if (internalDate && typeof internalDate.toDate === 'function') {
    emailDate = internalDate.toDate();
  } else if (internalDate && internalDate.seconds) {
    // Firestore Timestamp as plain object
    emailDate = new Date(internalDate.seconds * 1000);
  } else if (typeof internalDate === 'string') {
    // Try parsing as number first (string timestamp)
    const parsed = parseInt(internalDate, 10);
    if (!isNaN(parsed)) {
      emailDate = new Date(parsed);
    } else {
      emailDate = new Date(internalDate);
    }
  } else if (typeof internalDate === 'number') {
    emailDate = new Date(internalDate);
  } else {
    return '';
  }
  
  // Check if date is valid
  if (isNaN(emailDate.getTime())) {
    return '';
  }

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatDate(internalDate: any): string {
  if (internalDate === null || internalDate === undefined) return '';
  
  let emailDate: Date;
  
  // Handle Firestore Timestamp object
  if (internalDate && typeof internalDate.toDate === 'function') {
    emailDate = internalDate.toDate();
  } else if (internalDate && internalDate.seconds) {
    // Firestore Timestamp as plain object
    emailDate = new Date(internalDate.seconds * 1000);
  } else if (typeof internalDate === 'string') {
    // Try parsing as number first (string timestamp)
    const parsed = parseInt(internalDate, 10);
    if (!isNaN(parsed)) {
      emailDate = new Date(parsed);
    } else {
      emailDate = new Date(internalDate);
    }
  } else if (typeof internalDate === 'number') {
    emailDate = new Date(internalDate);
  } else {
    return '';
  }
  
  // Check if date is valid
  if (isNaN(emailDate.getTime())) {
    return '';
  }

  return emailDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Helper: Extract sender name from "Name <email>" format
function extractSenderName(from: string, fromName: string): string {
  if (fromName) return fromName;
  const match = from.match(/^([^<]+)</);
  if (match) return match[1].trim();
  return from.split('@')[0];
}

// Helper: Extract email address from "Name <email>" format
function extractEmail(from: string): string {
  const match = from.match(/<(.+)>/);
  return match ? match[1] : from;
}

export function useEmails(userId: string | undefined, category: Category): UseEmailsReturn {
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

    const emailsRef = collection(db, 'users', userId, 'emails');
    
    let q: Query<DocumentData>;
    
    // Query by visible_in_* flags instead of is_read
    // Emails stay visible until user marks them as DONE (not just read)
    if (category === 'promises') {
      // For promises, use moved_to_promises flag
      q = query(
        emailsRef,
        where('moved_to_promises', '==', true),
        where('user_marked_done', '==', false),
        orderBy('internal_date', 'desc')
      );
    } else if (category === 'awaiting') {
      // For awaiting, use moved_to_awaiting flag
      q = query(
        emailsRef,
        where('moved_to_awaiting', '==', true),
        where('user_marked_done', '==', false),
        orderBy('internal_date', 'desc')
      );
    } else if (category === 'urgent') {
      // Urgent: visible_in_urgent = true
      q = query(
        emailsRef,
        where('visible_in_urgent', '==', true),
        orderBy('internal_date', 'desc')
      );
    } else if (category === 'important') {
      // Important: visible_in_important = true
      q = query(
        emailsRef,
        where('visible_in_important', '==', true),
        orderBy('internal_date', 'desc')
      );
    } else {
      // Others: visible_in_others = true
      q = query(
        emailsRef,
        where('visible_in_others', '==', true),
        orderBy('internal_date', 'desc')
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const emailList: Email[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Transform Firestore data to match original Email interface
          // Try multiple date fields - including Firestore Timestamp fields
          const internalDate = data.internal_date || data.internalDate || data.date || data.received_at || data.createdAt || data.created_at || data.timestamp || null;
          
          emailList.push({
            id: doc.id,
            sender: extractSenderName(data.from || '', data.from_name || ''),
            senderEmail: extractEmail(data.from || ''),
            subject: data.subject || '(No Subject)',
            preview: data.snippet || '',
            body: data.body_html || data.body_plain || data.snippet || '',
            time: formatTime(internalDate),
            date: formatDate(internalDate),
            isRead: data.is_read || false,
            // v2.0 FIX: Read hasAttachment directly from Firestore, not from gmail_labels
            hasAttachment: data.hasAttachment === true,
            // v2.0: Include attachments array from Firestore
            attachments: data.attachments || [],
          });
        });
        setEmails(emailList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching emails:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, category]);

  return { emails, loading, error };
}