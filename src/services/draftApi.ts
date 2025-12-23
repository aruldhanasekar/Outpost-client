// services/draftApi.ts - Draft email operations (Firestore only, no Gmail API)
// Works for both Direct Auth and Composio users

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '@/firebase.config';

// Original email snapshot for reply/forward context
export interface OriginalEmailSnapshot {
  sender: string;
  senderEmail: string;
  date: string;
  time: string;
  body: string;
  subject: string;
  to?: string[];  // For forward
  message_id?: string;
}

export interface DraftData {
  id?: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body_html: string;
  body_plain: string;
  attachments: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
  }>;
  // Draft type
  draft_type: 'compose' | 'reply' | 'forward';
  // For reply context
  reply_mode?: 'reply' | 'replyAll';
  thread_id?: string;
  message_id?: string;  // For In-Reply-To header
  // Original email snapshot (for reply/forward)
  original_email?: OriginalEmailSnapshot;
  // Timestamps
  created_at?: Timestamp | Date;
  updated_at?: Timestamp | Date;
}

/**
 * Save or update a draft to Firestore
 * @param draft - Draft data to save
 * @param existingDraftId - If updating an existing draft
 * @returns Draft ID
 */
export async function saveDraft(
  draft: Omit<DraftData, 'id' | 'created_at' | 'updated_at'>,
  existingDraftId?: string
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  
  const draftsRef = collection(db, 'users', user.uid, 'drafts');
  
  // Use existing ID or create new one
  const draftId = existingDraftId || doc(draftsRef).id;
  const draftRef = doc(draftsRef, draftId);
  
  // Check if this is an update or new draft
  const existingDoc = existingDraftId ? await getDoc(draftRef) : null;
  const isUpdate = existingDoc?.exists();
  
  // Build draft data with timestamps
  const draftData = {
    ...draft,
    updated_at: serverTimestamp(),
    ...(isUpdate ? {} : { created_at: serverTimestamp() })
  };
  
  await setDoc(draftRef, draftData, { merge: isUpdate });
  
  console.log(`💾 Draft ${isUpdate ? 'updated' : 'saved'}: ${draftId}`);
  
  return draftId;
}

/**
 * Load a draft from Firestore
 * @param draftId - Draft ID to load
 * @returns Draft data or null if not found
 */
export async function loadDraft(draftId: string): Promise<DraftData | null> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  
  const draftRef = doc(db, 'users', user.uid, 'drafts', draftId);
  const draftDoc = await getDoc(draftRef);
  
  if (!draftDoc.exists()) {
    return null;
  }
  
  return {
    id: draftDoc.id,
    ...draftDoc.data()
  } as DraftData;
}

/**
 * Delete a draft from Firestore
 * @param draftId - Draft ID to delete
 */
export async function deleteDraft(draftId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  
  const draftRef = doc(db, 'users', user.uid, 'drafts', draftId);
  await deleteDoc(draftRef);
  
  console.log(`🗑️ Draft deleted: ${draftId}`);
}

/**
 * Check if the draft has any content worth saving
 * Returns true if there's at least one recipient, subject, body, or attachment
 */
export function isDraftWorthSaving(draft: Partial<DraftData>): boolean {
  // Has recipients
  if (draft.to && draft.to.length > 0) return true;
  if (draft.cc && draft.cc.length > 0) return true;
  if (draft.bcc && draft.bcc.length > 0) return true;
  
  // Has subject
  if (draft.subject && draft.subject.trim().length > 0) return true;
  
  // Has body content
  if (draft.body_plain && draft.body_plain.trim().length > 0) return true;
  
  // Has attachments
  if (draft.attachments && draft.attachments.length > 0) return true;
  
  return false;
}