// hooks/useCategoryMoveNotifications.ts
// Detects when emails are moved to Promises or Awaiting categories via real-time Firestore updates
// v1.0: Initial implementation using onSnapshot with docChanges()

import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, where, onSnapshot, DocumentChange } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { CategoryMoveNotification } from '@/components/ui/CategoryMoveToast';

interface UseCategoryMoveNotificationsReturn {
  notifications: CategoryMoveNotification[];
  dismissNotification: (id: string) => void;
}

// How recent an update must be to show a notification (30 seconds)
const RECENCY_THRESHOLD_MS = 30 * 1000;

// Maximum notifications to show at once
const MAX_NOTIFICATIONS = 5;

export function useCategoryMoveNotifications(
  userId: string | undefined
): UseCategoryMoveNotificationsReturn {
  const [notifications, setNotifications] = useState<CategoryMoveNotification[]>([]);
  
  // Track thread IDs we've already shown notifications for (persists across renders)
  const shownPromiseThreads = useRef<Set<string>>(new Set());
  const shownAwaitingThreads = useRef<Set<string>>(new Set());
  
  // Track if this is the initial load (don't show notifications for existing data)
  const isInitialLoad = useRef(true);
  const initialLoadTimer = useRef<NodeJS.Timeout | null>(null);

  // Dismiss a notification by ID
  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Add a notification (with deduplication and limit)
  const addNotification = useCallback((notification: CategoryMoveNotification) => {
    setNotifications(prev => {
      // Check if already exists
      if (prev.some(n => n.id === notification.id)) {
        return prev;
      }
      
      // Add to front, limit total
      const updated = [notification, ...prev].slice(0, MAX_NOTIFICATIONS);
      return updated;
    });
  }, []);

  useEffect(() => {
    if (!userId) {
      return;
    }

    // Reset initial load flag
    isInitialLoad.current = true;
    
    // Clear any existing timer
    if (initialLoadTimer.current) {
      clearTimeout(initialLoadTimer.current);
    }

    // After 2 seconds, consider initial load complete
    initialLoadTimer.current = setTimeout(() => {
      isInitialLoad.current = false;
    }, 2000);

    const threadsRef = collection(db, 'users', userId, 'threads');
    
    // Query for threads with promises OR awaiting
    // We'll use two separate listeners for better filtering
    
    // Listener for Promise threads
    const promiseQuery = query(
      threadsRef,
      where('has_promise', '==', true),
      where('status', '==', 'active')
    );

    const unsubscribePromise = onSnapshot(
      promiseQuery,
      (snapshot) => {
        // Skip if initial load
        if (isInitialLoad.current) {
          // Mark all current threads as "seen" on initial load
          snapshot.docs.forEach(doc => {
            shownPromiseThreads.current.add(doc.id);
          });
          return;
        }

        // Process changes
        snapshot.docChanges().forEach((change: DocumentChange) => {
          const threadId = change.doc.id;
          const data = change.doc.data();
          
          // Only process "added" or "modified" (when has_promise becomes true)
          if (change.type === 'added' || change.type === 'modified') {
            // Check if we've already shown this notification
            if (shownPromiseThreads.current.has(threadId)) {
              return;
            }

            // Check if update is recent (within threshold)
            const updatedAt = data.updated_at;
            if (updatedAt) {
              const updateTime = new Date(updatedAt).getTime();
              const now = Date.now();
              
              if (now - updateTime > RECENCY_THRESHOLD_MS) {
                // Old update, mark as seen but don't notify
                shownPromiseThreads.current.add(threadId);
                return;
              }
            }

            // Mark as shown
            shownPromiseThreads.current.add(threadId);

            // Add notification
            addNotification({
              id: `promise-${threadId}`,
              type: 'promise',
              subject: data.gmail_subject || '(No Subject)',
              timestamp: Date.now()
            });
          }
        });
      },
      (error) => {
        console.error('Error listening to promise threads:', error);
      }
    );

    // Listener for Awaiting threads
    const awaitingQuery = query(
      threadsRef,
      where('has_awaiting', '==', true),
      where('status', '==', 'active')
    );

    const unsubscribeAwaiting = onSnapshot(
      awaitingQuery,
      (snapshot) => {
        // Skip if initial load
        if (isInitialLoad.current) {
          // Mark all current threads as "seen" on initial load
          snapshot.docs.forEach(doc => {
            shownAwaitingThreads.current.add(doc.id);
          });
          return;
        }

        // Process changes
        snapshot.docChanges().forEach((change: DocumentChange) => {
          const threadId = change.doc.id;
          const data = change.doc.data();
          
          // Only process "added" or "modified" (when has_awaiting becomes true)
          if (change.type === 'added' || change.type === 'modified') {
            // Check if we've already shown this notification
            if (shownAwaitingThreads.current.has(threadId)) {
              return;
            }

            // Check if update is recent (within threshold)
            const updatedAt = data.updated_at;
            if (updatedAt) {
              const updateTime = new Date(updatedAt).getTime();
              const now = Date.now();
              
              if (now - updateTime > RECENCY_THRESHOLD_MS) {
                // Old update, mark as seen but don't notify
                shownAwaitingThreads.current.add(threadId);
                return;
              }
            }

            // Mark as shown
            shownAwaitingThreads.current.add(threadId);

            // Add notification
            addNotification({
              id: `awaiting-${threadId}`,
              type: 'awaiting',
              subject: data.gmail_subject || '(No Subject)',
              timestamp: Date.now()
            });
          }
        });
      },
      (error) => {
        console.error('Error listening to awaiting threads:', error);
      }
    );

    return () => {
      unsubscribePromise();
      unsubscribeAwaiting();
      if (initialLoadTimer.current) {
        clearTimeout(initialLoadTimer.current);
      }
    };
  }, [userId, addNotification]);

  return { notifications, dismissNotification };
}

export default useCategoryMoveNotifications;