// hooks/useDraftEmails.ts - Fetch draft emails from Firestore

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { Email } from '../components/inbox/types';

interface UseDraftEmailsResult {
  emails: Email[];
  loading: boolean;
  error: string | null;
}

export function useDraftEmails(userId: string | undefined): UseDraftEmailsResult {
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

    // Query from users/{uid}/drafts collection
    const draftsRef = collection(db, 'users', userId, 'drafts');
    const q = query(
      draftsRef,
      orderBy('updated_at', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const draftList: Email[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          
          // Format time for display
          let timeDisplay = '';
          let dateDisplay = '';
          
          const timestamp = data.updated_at || data.created_at;
          if (timestamp) {
            // Handle Firestore Timestamp or string
            const draftDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
            
            if (draftDate >= today) {
              timeDisplay = draftDate.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              });
            } else if (draftDate >= yesterday) {
              timeDisplay = 'Yesterday';
            } else {
              timeDisplay = draftDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              });
            }
            
            dateDisplay = draftDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
          }

          // Extract recipient (to field) - handle both array and string format
          const toField = data.to;
          const toStr = Array.isArray(toField) ? (toField[0] || '') : (toField || '');
          const recipientMatch = toStr.match(/^([^<]+)</);
          const rawUsername = toStr.split('@')[0] || '';
          const formattedUsername = rawUsername.split(/[._-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ') || '(No recipient)';
          const recipient = recipientMatch ? recipientMatch[1].trim() : formattedUsername;

          // Add draft type indicator to subject
          let displaySubject = data.subject || '(No subject)';
          const draftType = data.draft_type;
          if (draftType === 'reply' && !displaySubject.toLowerCase().startsWith('re:')) {
            displaySubject = `(Reply) ${displaySubject}`;
          } else if (draftType === 'forward' && !displaySubject.toLowerCase().startsWith('fwd:')) {
            displaySubject = `(Fwd) ${displaySubject}`;
          }

          return {
            id: doc.id,
            sender: recipient, // For drafts, we show recipient in the list
            senderEmail: toStr,
            subject: displaySubject,
            preview: data.body_plain?.substring(0, 100) || data.body_html?.replace(/<[^>]*>/g, '').substring(0, 100) || '',
            body: data.body_html || data.body_plain || '',
            time: timeDisplay,
            date: dateDisplay,
            isRead: true, // Drafts are always "read"
            hasAttachment: (data.attachments && data.attachments.length > 0) || data.has_attachment || false,
            thread_id: data.thread_id || doc.id,
          };
        });

        setEmails(draftList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching drafts:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { emails, loading, error };
}