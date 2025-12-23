// hooks/useDraftEmails.ts - Fetch draft emails from Firestore
// Updated to work with new draft structure (to as array)

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase.config';

// Draft attachment structure (different from email attachments)
export interface DraftAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
}

// DraftEmail type for drafts list - compatible with EmailList component
export interface DraftEmail {
  id: string;
  draft_id: string;
  sender: string; // Shows recipient in drafts list
  senderEmail: string;
  subject: string;
  preview: string;
  body: string;
  time: string;
  date: string;
  isRead: boolean;
  hasAttachment: boolean;
  thread_id: string;
  // Draft-specific fields for editing
  to_list: string[];
  cc_list: string[];
  bcc_list: string[];
  body_html: string;
  body_plain: string;
  draft_type: 'compose' | 'reply' | 'forward';
  draft_attachments: DraftAttachment[];
}

interface UseDraftEmailsResult {
  emails: DraftEmail[];
  loading: boolean;
  error: string | null;
}

export function useDraftEmails(userId: string | undefined): UseDraftEmailsResult {
  const [emails, setEmails] = useState<DraftEmail[]>([]);
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
        const draftList: DraftEmail[] = snapshot.docs.map((doc) => {
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

          // Extract recipients (to field is now an array)
          const toArray: string[] = data.to || [];
          const firstRecipient = toArray[0] || '';
          
          // Extract display name from email
          const recipientMatch = firstRecipient.match(/^([^<]+)</);
          let recipientDisplay = recipientMatch 
            ? recipientMatch[1].trim() 
            : firstRecipient.split('@')[0] || '(No recipient)';
          
          // If multiple recipients, show count
          if (toArray.length > 1) {
            recipientDisplay += ` +${toArray.length - 1}`;
          }

          // Get preview text
          const preview = data.body_plain?.substring(0, 100) 
            || data.body_html?.replace(/<[^>]*>/g, '').substring(0, 100) 
            || '';

          return {
            id: doc.id,
            draft_id: doc.id,
            sender: recipientDisplay, // For drafts, we show recipient as "sender" in list
            senderEmail: firstRecipient,
            subject: data.subject || '(No subject)',
            preview: preview,
            body: data.body_html || data.body_plain || '',
            time: timeDisplay,
            date: dateDisplay,
            isRead: true, // Drafts are always "read"
            hasAttachment: (data.attachments && data.attachments.length > 0) || false,
            thread_id: data.reply_to_thread_id || doc.id,
            // Draft-specific fields
            to_list: toArray,
            cc_list: data.cc || [],
            bcc_list: data.bcc || [],
            body_html: data.body_html || '',
            body_plain: data.body_plain || '',
            draft_type: data.draft_type || 'compose',
            draft_attachments: data.attachments || [],
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