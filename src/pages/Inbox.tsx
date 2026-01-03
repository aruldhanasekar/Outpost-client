import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2, Menu, Mail, MailOpen, Check, Trash2 } from "lucide-react";
import {
  Category,
  CategoryCounts,
  Thread,
  Email,
  usePromises,
  useAwaiting,
  useThreadEmails,
  CategoryNav,
  CategoryDropdown,
  PromiseList,
  AwaitingList,
  ThreadList,
  ThreadDetail,
  MobileThreadDetail,
  ComposeModal,
  ReplyModal,
  ForwardModal,
  MobileSelectionBar,
} from "@/components/inbox";
import { SearchModal } from "@/components/search";
import { CreateLabelModal } from "@/components/labels/CreateLabelModal";
import { UndoEmailData } from "@/components/inbox/ComposeModal";
import { useThreads } from "@/hooks/useThreads";
import { 
  batchMarkAsDone, 
  batchMarkAsRead,
  batchMarkAsUnread,
  batchDelete,
  getLabels,
  getEmail,
  applyLabelToThread,
  removeLabelFromThread
} from "@/services/emailApi";
import { UndoToast } from "@/components/ui/UndoToast";
import { EmailSendUndoToast } from "@/components/ui/EmailSendUndoToast";
import { CategoryMoveToast } from "@/components/ui/CategoryMoveToast";
import { Sidebar } from "@/components/layout";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import ComposioConnectionOverlay from "@/components/ComposioConnectionOverlay";
import SyncLoadingOverlay from "@/components/SyncLoadingOverlay";
import { useCategoryMoveNotifications } from "@/hooks/useCategoryMoveNotifications";

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const InboxPage = () => {
  const { currentUser, userProfile, loading: authLoading, backendUserData } = useAuth();
  const navigate = useNavigate();
  
  // Check if Composio user needs to connect Gmail
  const needsComposioConnection = 
    currentUser && 
    backendUserData?.auth_method === 'composio' && 
    !backendUserData?.composio_connection_id;
  const [activeCategory, setActiveCategory] = useState<Category>("urgent");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Thread selection state - used for ALL categories now
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  
  // Expanded overlay state (desktop only)
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Local state for optimistic UI updates
  const [localReadThreads, setLocalReadThreads] = useState<Set<string>>(new Set());
  const [localUnreadThreads, setLocalUnreadThreads] = useState<Set<string>>(new Set());
  const [localDoneThreads, setLocalDoneThreads] = useState<Set<string>>(new Set());
  const [localDeletedThreads, setLocalDeletedThreads] = useState<Set<string>>(new Set());
  const [localThreadLabels, setLocalThreadLabels] = useState<Map<string, Array<{ id: string; name: string; color: string }>>>(new Map());
  const [localMovedThreads, setLocalMovedThreads] = useState<Map<string, { from: string; to: string }>>(new Map()); // threadId -> { from, to }
  
  // Checked threads state (for bulk selection)
  const [checkedThreads, setCheckedThreads] = useState<Set<string>>(new Set());
  
  // Mobile selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  const [showSyncLoading, setShowSyncLoading] = useState(false);


  // Toast state for undo functionality
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    threadIds: string[];
    emailIds: string[];
    timeoutId: NodeJS.Timeout | null;
  }>({ show: false, message: '', threadIds: [], emailIds: [], timeoutId: null });

  // Compose modal state
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Search modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Email send undo toast state
  const [emailUndoToast, setEmailUndoToast] = useState<{
    show: boolean;
    emailId: string;
    recipients: string[];
    emailData: UndoEmailData;
  } | null>(null);

  // Reply modal state
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyMode, setReplyMode] = useState<'reply' | 'replyAll'>('reply');
  const [replyToEmail, setReplyToEmail] = useState<Email | null>(null);

  // Forward modal state
  const [isForwardOpen, setIsForwardOpen] = useState(false);
  const [forwardEmail, setForwardEmail] = useState<Email | null>(null);

  // v6.0: Optimistic reply state - show reply immediately in thread
  const [optimisticReply, setOptimisticReply] = useState<{ email: Email; threadId: string } | null>(null);

  // Undo restore state - stores data to restore when undo is clicked
  const [undoComposeData, setUndoComposeData] = useState<UndoEmailData | null>(null);

  // Labels state for context menu
  const [allLabels, setAllLabels] = useState<Array<{ id: string; name: string; color: string }>>([]);
  
  // Create label modal state (for context menu)
  const [isCreateLabelOpen, setIsCreateLabelOpen] = useState(false);

  // v4.0: Ref for tracking last key pressed (for R+A combo)
  const lastKeyRef = useRef<string | null>(null);

  // v3.1: Auth token getter for tracking API calls
  const getAuthToken = useCallback(async (): Promise<string> => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    return currentUser.getIdToken();
  }, [currentUser]);

  // ==================== DATA FETCHING ====================
  
  // Fetch threads for URGENT category
  const { 
    threads: urgentThreads, 
    loading: urgentLoading, 
    error: urgentError 
  } = useThreads(currentUser?.uid, 'URGENT');
  
  // Fetch threads for IMPORTANT category
  const { 
    threads: importantThreads, 
    loading: importantLoading, 
    error: importantError 
  } = useThreads(currentUser?.uid, 'IMPORTANT');
  
  // Fetch threads for OTHERS category
  const { 
    threads: othersThreads, 
    loading: othersLoading, 
    error: othersError 
  } = useThreads(currentUser?.uid, 'OTHERS');
  
  // Fetch threads for Promises category (existing hook)
  const { 
    threads: promiseThreads, 
    loading: promisesLoading, 
    error: promisesError 
  } = usePromises(currentUser?.uid);
  
  // Fetch threads for Awaiting category (existing hook)
  const { 
    threads: awaitingThreads, 
    loading: awaitingLoading, 
    error: awaitingError 
  } = useAwaiting(currentUser?.uid);

  // Category move notifications (Promise/Awaiting detection)
  const { 
    notifications: categoryMoveNotifications, 
    dismissNotification: dismissCategoryMoveNotification 
  } = useCategoryMoveNotifications(currentUser?.uid);
  
  // Fetch emails for selected thread
  const { 
    emails: threadEmails, 
    loading: threadEmailsLoading 
  } = useThreadEmails(
    currentUser?.uid,
    selectedThread?.email_ids || []
  );

  // v6.0: Combine threadEmails with optimisticReply for display
  const displayEmails = useMemo(() => {
    // Only add optimistic if it matches current thread
    if (optimisticReply && selectedThread && optimisticReply.threadId === selectedThread.thread_id) {
      return [...threadEmails, optimisticReply.email];
    }
    return threadEmails;
  }, [threadEmails, optimisticReply, selectedThread]);

  // v6.0: Clear optimisticReply when selectedThread changes
  useEffect(() => {
    if (optimisticReply && selectedThread?.thread_id !== optimisticReply.threadId) {
      console.log('🧹 Clearing optimistic reply (thread changed)');
      setOptimisticReply(null);
    }
  }, [selectedThread?.thread_id, optimisticReply]);

  // v6.0: Clear optimisticReply when webhook syncs new email (threadEmails grows)
  const prevThreadEmailsLengthRef = useRef(threadEmails.length);
  useEffect(() => {
    if (optimisticReply && threadEmails.length > prevThreadEmailsLengthRef.current) {
      console.log('✅ Clearing optimistic reply (new email synced via webhook)');
      setOptimisticReply(null);
    }
    prevThreadEmailsLengthRef.current = threadEmails.length;
  }, [threadEmails.length, optimisticReply]);

  // Fetch all labels for context menu
  useEffect(() => {
    const fetchLabels = async () => {
      if (!currentUser) return;
      
      try {
        const data = await getLabels();
        const labels = (data.labels || []).map((l) => ({
          id: l.id,
          name: l.display_name || l.name,
          color: l.color || '#8FA8A3'
        }));
        setAllLabels(labels);
      } catch (err) {
        console.error('Error fetching labels:', err);
      }
    };
    
    fetchLabels();
  }, [currentUser]);

  // ==================== COMPUTED STATE ====================
  
  // Get threads for current category with local state applied
  const currentThreads = useMemo(() => {
  let threads: Thread[] = [];
  
  switch (activeCategory) {
    case 'urgent':
      threads = urgentThreads;
      break;
    case 'important':
      threads = importantThreads;
      break;
    case 'others':
      threads = othersThreads;
      break;
    case 'promises':
      threads = promiseThreads;
      break;
    case 'awaiting':
      threads = awaitingThreads;
      break;
    default:
      threads = [];
  }
  
  // Apply local state filters and read/unread state
  return threads
    .filter(thread => !localDoneThreads.has(thread.thread_id))
    .filter(thread => !localDeletedThreads.has(thread.thread_id))
    .filter(thread => {
      // Only hide thread if we're viewing the source category it was moved FROM
      const moveInfo = localMovedThreads.get(thread.thread_id);
      return !(moveInfo && activeCategory.toUpperCase() === moveInfo.from);
    })
    .map(thread => ({
      ...thread,
      // Apply local read/unread state
      is_read: localUnreadThreads.has(thread.thread_id)
        ? false
        : localReadThreads.has(thread.thread_id)
          ? true
          : thread.is_read,
      // Apply local label updates
      labels: localThreadLabels.get(thread.thread_id) || (thread as Thread & { labels?: Array<{ id: string; name: string; color: string }> }).labels || []
    }));
}, [
  activeCategory, 
  urgentThreads, 
  importantThreads, 
  othersThreads, 
  promiseThreads, 
  awaitingThreads,
  localDoneThreads,
  localDeletedThreads,
  localMovedThreads,
  localReadThreads,
  localUnreadThreads,
  localThreadLabels  // Add this dependency
]);
  
  // Get loading/error state for current category
  const currentLoading = useMemo(() => {
    switch (activeCategory) {
      case 'urgent': return urgentLoading;
      case 'important': return importantLoading;
      case 'others': return othersLoading;
      case 'promises': return promisesLoading;
      case 'awaiting': return awaitingLoading;
      default: return false;
    }
  }, [activeCategory, urgentLoading, importantLoading, othersLoading, promisesLoading, awaitingLoading]);
  
  const currentError = useMemo(() => {
    switch (activeCategory) {
      case 'urgent': return urgentError;
      case 'important': return importantError;
      case 'others': return othersError;
      case 'promises': return promisesError;
      case 'awaiting': return awaitingError;
      default: return null;
    }
  }, [activeCategory, urgentError, importantError, othersError, promisesError, awaitingError]);

  // Calculate unread counts (considers local state for real-time updates)
  const categoryCounts: CategoryCounts = useMemo(() => {
    const countUnread = (threads: Thread[]) => {
      return threads.filter(t => {
        // If locally marked unread, count it
        if (localUnreadThreads.has(t.thread_id)) return true;
        // If locally marked read, don't count it
        if (localReadThreads.has(t.thread_id)) return false;
        // Otherwise use Firestore value
        return t.is_read === false;
      }).length;
    };
    
    return {
      urgent: countUnread(urgentThreads),
      important: countUnread(importantThreads),
      promises: countUnread(promiseThreads),
      awaiting: countUnread(awaitingThreads),
      others: countUnread(othersThreads),
    };
  }, [urgentThreads, importantThreads, promiseThreads, awaitingThreads, othersThreads, localReadThreads, localUnreadThreads]);

  // ==================== AUTH CHECK ====================

  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate("/");
    }
  }, [currentUser, authLoading, navigate]);

  // ==================== SYNC LOADING DETECTION ====================
  
  // Show sync loading overlay when sync starts
  useEffect(() => {
    if (!backendUserData) return;
    
    const syncStatus = backendUserData.sync_status;
    
    // Check if sync just started
    if (syncStatus === 'starting' || syncStatus === 'syncing_inbox') {
      console.log('🔄 Sync started - showing loading overlay');
      setShowSyncLoading(true);
    }
  }, [backendUserData]);

  // ==================== COMPOSIO CALLBACK HANDLER ====================
  
  // Handle Composio redirect callback
  useEffect(() => {
    const handleComposioCallback = async () => {
      // Only run if user is logged in
      if (!currentUser) return;
      
      // Check URL parameters
      const params = new URLSearchParams(window.location.search);
      const composioConnected = params.get('composio_connected');
      const connectionId = params.get('connected_account_id');
      const status = params.get('status');
      
      // If Composio redirect detected
      if (composioConnected === 'true' && connectionId && status === 'success') {
        console.log('🔵 Composio callback detected');
        console.log('   Connection ID:', connectionId);
        
        try {
          // Get auth token
          const idToken = await currentUser.getIdToken();
          
          // Call backend to finalize connection
          console.log('📡 Calling backend to finalize connection...');
          const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/composio/finalize?connection_id=${connectionId}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json',
              'ngrok-skip-browser-warning': 'true'
            }
          });
          
          if (!response.ok) {
            throw new Error(`Backend finalization failed: ${response.status}`);
          }
          
          const data = await response.json();
          console.log('✅ Composio connection finalized:', data);
          
          // Force refresh token to get new custom claims (auth_method: 'composio')
          await currentUser.getIdToken(true);
          console.log('🔄 Token refreshed with new custom claims');
          
          // Clean URL (remove parameters)
          window.history.replaceState({}, '', '/inbox');
          
          // Show sync overlay will appear automatically when backend updates sync_status
          
        } catch (error) {
          console.error('❌ Error finalizing Composio connection:', error);
          // TODO: Show error toast to user
        }
      }
    };
    
    handleComposioCallback();
  }, [currentUser]); // Run when user changes

  // ==================== THREAD CLICK HANDLERS ====================

  // Handle thread click - select thread, mark as read
  const handleThreadClick = useCallback(async (thread: Thread) => {
    setSelectedThread(thread);
    
    // Remove from unread set if it was there
    if (localUnreadThreads.has(thread.thread_id)) {
      setLocalUnreadThreads(prev => {
        const newSet = new Set(prev);
        newSet.delete(thread.thread_id);
        return newSet;
      });
    }
    
    // Mark all emails in thread as read
    const emailIds = thread.email_ids || [];
    if (emailIds.length > 0 && !localReadThreads.has(thread.thread_id)) {
      setLocalReadThreads(prev => new Set(prev).add(thread.thread_id));
      
      batchMarkAsRead(emailIds)
        .then(response => {
          console.log('✅ Thread marked as read:', response);
        })
        .catch(error => {
          console.error('❌ Failed to mark thread as read:', error);
        });
    }
  }, [localReadThreads, localUnreadThreads]);

  // Close detail panel
  const handleCloseDetail = useCallback(() => {
    setSelectedThread(null);
    setIsExpanded(false);
  }, []);
  
  // Close only the expanded overlay
  const handleCloseExpanded = useCallback(() => {
    setIsExpanded(false);
  }, []);
  
  // Toggle expanded overlay view
  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);
  
  // ==================== NAVIGATION ====================
  
  // Calculate navigation state
  const { currentThreadIndex, hasPreviousThread, hasNextThread } = useMemo(() => {
    const index = selectedThread 
      ? currentThreads.findIndex(t => t.thread_id === selectedThread.thread_id) 
      : -1;
    return {
      currentThreadIndex: index,
      hasPreviousThread: index > 0,
      hasNextThread: index >= 0 && index < currentThreads.length - 1
    };
  }, [selectedThread, currentThreads]);
  
  // Navigate to previous thread
  const handlePreviousThread = useCallback(() => {
    if (!selectedThread || currentThreadIndex <= 0) return;
    const prevThread = currentThreads[currentThreadIndex - 1];
    handleThreadClick(prevThread);
  }, [currentThreads, selectedThread, currentThreadIndex, handleThreadClick]);
  
  // Navigate to next thread
  const handleNextThread = useCallback(() => {
    if (!selectedThread || currentThreadIndex >= currentThreads.length - 1) return;
    const nextThread = currentThreads[currentThreadIndex + 1];
    handleThreadClick(nextThread);
  }, [currentThreads, selectedThread, currentThreadIndex, handleThreadClick]);

  // Handle category change
  const handleCategoryChange = useCallback((category: Category) => {
    setActiveCategory(category);
    setCheckedThreads(new Set());
  }, []);

  // ==================== CHECKBOX SELECTION ====================
  
  const handleCheckChange = useCallback((thread: Thread, checked: boolean) => {
    setCheckedThreads(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(thread.thread_id);
      } else {
        newSet.delete(thread.thread_id);
      }
      // Exit selection mode if no items checked
      if (newSet.size === 0) {
        setIsSelectionMode(false);
      }
      return newSet;
    });
  }, []);
  
  const handleGlobalCheckChange = useCallback(() => {
    const isAllSelected = checkedThreads.size > 0 && checkedThreads.size === currentThreads.length;
    
    if (isAllSelected) {
      // All selected → Deselect all (but stay in selection mode)
      setCheckedThreads(new Set());
    } else {
      // None or some selected → Select all
      const allIds = new Set(currentThreads.map(t => t.thread_id));
      setCheckedThreads(allIds);
      setIsSelectionMode(true);
    }
  }, [checkedThreads.size, currentThreads]);

  // Long-press handler for mobile selection mode
  const handleLongPress = useCallback((thread: Thread) => {
    setIsSelectionMode(true);
  }, []);

  // ==================== BATCH ACTIONS ====================
  
  // Get all email IDs from checked threads
  const getEmailIdsFromCheckedThreads = useCallback(() => {
    const emailIds: string[] = [];
    currentThreads.forEach(thread => {
      if (checkedThreads.has(thread.thread_id)) {
        emailIds.push(...(thread.email_ids || []));
      }
    });
    return emailIds;
  }, [currentThreads, checkedThreads]);
  
  // Batch mark as read
  const handleBatchMarkAsRead = useCallback(async () => {
    if (checkedThreads.size === 0) return;
    
    const threadIds = Array.from(checkedThreads);
    const emailIds = getEmailIdsFromCheckedThreads();
    console.log('📖 Batch marking as read:', threadIds.length, 'threads');
    
    // Add to read set
    setLocalReadThreads(prev => {
      const newSet = new Set(prev);
      threadIds.forEach(id => newSet.add(id));
      return newSet;
    });
    
    // Remove from unread set
    setLocalUnreadThreads(prev => {
      const newSet = new Set(prev);
      threadIds.forEach(id => newSet.delete(id));
      return newSet;
    });
    
    setCheckedThreads(new Set());
    setIsSelectionMode(false);
    
    if (emailIds.length > 0) {
      batchMarkAsRead(emailIds)
        .then(response => {
          console.log('✅ Batch marked as read:', response);
        })
        .catch(error => {
          console.error('❌ Failed to batch mark as read:', error);
        });
    }
  }, [checkedThreads, getEmailIdsFromCheckedThreads]);
  
  // Batch mark as unread
  const handleBatchMarkAsUnread = useCallback(async () => {
    if (checkedThreads.size === 0) return;
    
    const threadIds = Array.from(checkedThreads);
    const emailIds = getEmailIdsFromCheckedThreads();
    console.log('📬 Batch marking as unread:', threadIds.length, 'threads');
    
    // Remove from read set
    setLocalReadThreads(prev => {
      const newSet = new Set(prev);
      threadIds.forEach(id => newSet.delete(id));
      return newSet;
    });
    
    // Add to unread set
    setLocalUnreadThreads(prev => {
      const newSet = new Set(prev);
      threadIds.forEach(id => newSet.add(id));
      return newSet;
    });
    
    setCheckedThreads(new Set());
    setIsSelectionMode(false);
    
    if (emailIds.length > 0) {
      batchMarkAsUnread(emailIds)
        .then(response => {
          console.log('✅ Batch marked as unread:', response);
        })
        .catch(error => {
          console.error('❌ Failed to batch mark as unread:', error);
        });
    }
  }, [checkedThreads, getEmailIdsFromCheckedThreads]);
  
  // Batch mark as done
  const handleBatchMarkAsDone = useCallback(async () => {
    if (checkedThreads.size === 0) return;
    
    const threadIds = Array.from(checkedThreads);
    const emailIds = getEmailIdsFromCheckedThreads();
    console.log('✅ Batch marking as done:', threadIds.length, 'threads');
    
    setLocalDoneThreads(prev => {
      const newSet = new Set(prev);
      threadIds.forEach(id => newSet.add(id));
      return newSet;
    });
    
    if (selectedThread && threadIds.includes(selectedThread.thread_id)) {
      setSelectedThread(null);
    }
    setCheckedThreads(new Set());
    setIsSelectionMode(false);
    
    if (emailIds.length > 0) {
      batchMarkAsDone(emailIds)
        .then(response => {
          console.log('✅ Batch marked as done:', response);
        })
        .catch(error => {
          console.error('❌ Failed to batch mark as done:', error);
          setLocalDoneThreads(prev => {
            const newSet = new Set(prev);
            threadIds.forEach(id => newSet.delete(id));
            return newSet;
          });
        });
    }
  }, [checkedThreads, selectedThread, getEmailIdsFromCheckedThreads]);
  
  // Batch delete with undo
  const handleBatchDelete = useCallback(async () => {
    if (checkedThreads.size === 0) return;
    
    const threadIds = Array.from(checkedThreads);
    const emailIds = getEmailIdsFromCheckedThreads();
    console.log('🗑️ Batch deleting:', threadIds.length, 'threads');
    
    if (toast.timeoutId) {
      clearTimeout(toast.timeoutId);
    }
    
    setLocalDeletedThreads(prev => {
      const newSet = new Set(prev);
      threadIds.forEach(id => newSet.add(id));
      return newSet;
    });
    
    if (selectedThread && threadIds.includes(selectedThread.thread_id)) {
      setSelectedThread(null);
    }
    setCheckedThreads(new Set());
    setIsSelectionMode(false);
    
    const timeoutId = setTimeout(() => {
      batchDelete(emailIds)
        .then(response => {
          console.log('✅ Batch deleted:', response);
        })
        .catch(error => {
          console.error('❌ Failed to batch delete:', error);
          setLocalDeletedThreads(prev => {
            const newSet = new Set(prev);
            threadIds.forEach(id => newSet.delete(id));
            return newSet;
          });
        });
      
      setToast({ show: false, message: '', threadIds: [], emailIds: [], timeoutId: null });
    }, 3000);
    
    setToast({
      show: true,
      message: threadIds.length === 1 ? 'Thread moved to trash' : `${threadIds.length} threads moved to trash`,
      threadIds,
      emailIds,
      timeoutId
    });
  }, [checkedThreads, selectedThread, toast.timeoutId, getEmailIdsFromCheckedThreads]);

  // ==================== SINGLE THREAD ACTIONS ====================
  
  // Handle mark thread as done
  const handleMarkThreadDone = useCallback(async (thread: Thread) => {
    console.log('🎯 Marking thread as done:', thread.thread_id);
    
    const wasDetailOpen = selectedThread?.thread_id === thread.thread_id;
    
    setLocalDoneThreads(prev => new Set(prev).add(thread.thread_id));
    
    if (wasDetailOpen) {
      const currentIndex = currentThreads.findIndex(t => t.thread_id === thread.thread_id);
      let nextThread: Thread | null = null;
      
      if (currentIndex !== -1 && currentThreads.length > 1) {
        if (currentIndex < currentThreads.length - 1) {
          nextThread = currentThreads[currentIndex + 1];
        } else if (currentIndex > 0) {
          nextThread = currentThreads[currentIndex - 1];
        }
      }
      
      setSelectedThread(nextThread);
    }
    
    const emailIds = thread.email_ids || [];
    if (emailIds.length > 0) {
      batchMarkAsDone(emailIds)
        .then(response => {
          console.log('✅ Thread marked as done:', response);
        })
        .catch(error => {
          console.error('❌ Failed to mark thread as done:', error);
          setLocalDoneThreads(prev => {
            const newSet = new Set(prev);
            newSet.delete(thread.thread_id);
            return newSet;
          });
        });
    }
  }, [currentThreads, selectedThread]);

  // Handle delete thread with undo
  const handleDeleteThread = useCallback(async (thread: Thread) => {
    console.log('🗑️ Deleting thread:', thread.thread_id);
    
    if (toast.timeoutId) {
      clearTimeout(toast.timeoutId);
    }
    
    setLocalDeletedThreads(prev => new Set(prev).add(thread.thread_id));
    
    if (selectedThread?.thread_id === thread.thread_id) {
      setSelectedThread(null);
    }
    
    const emailIds = thread.email_ids || [];
    
    const timeoutId = setTimeout(() => {
      batchDelete(emailIds)
        .then(response => {
          console.log('✅ Thread deleted:', response);
        })
        .catch(error => {
          console.error('❌ Failed to delete thread:', error);
          setLocalDeletedThreads(prev => {
            const newSet = new Set(prev);
            newSet.delete(thread.thread_id);
            return newSet;
          });
        });
      
      setToast({ show: false, message: '', threadIds: [], emailIds: [], timeoutId: null });
    }, 3000);
    
    setToast({
      show: true,
      message: 'Thread moved to trash',
      threadIds: [thread.thread_id],
      emailIds,
      timeoutId
    });
  }, [toast.timeoutId, selectedThread]);
  
  // Handle undo delete
  const handleUndoDelete = useCallback(() => {
    if (toast.timeoutId) {
      clearTimeout(toast.timeoutId);
    }
    
    setLocalDeletedThreads(prev => {
      const newSet = new Set(prev);
      toast.threadIds.forEach(id => newSet.delete(id));
      return newSet;
    });
    
    setToast({ show: false, message: '', threadIds: [], emailIds: [], timeoutId: null });
    console.log('↩️ Undo delete:', toast.threadIds);
  }, [toast]);
  
  const handleCloseToast = useCallback(() => {
    setToast(prev => ({ ...prev, show: false }));
  }, []);

  // ==================== CATEGORY OVERRIDE HANDLER ====================
  
  // Called when user changes email category via dropdown
  const handleThreadCategoryOverride = useCallback((threadId: string, newCategory: string) => {
    console.log(`📁 Category changed: ${threadId} → ${newCategory} (from ${activeCategory.toUpperCase()})`);
    
    // Add to localMovedThreads with source category so it only hides from source
    setLocalMovedThreads(prev => {
      const newMap = new Map(prev);
      newMap.set(threadId, { from: activeCategory.toUpperCase(), to: newCategory });
      return newMap;
    });
    
    // Show toast
    const categoryLabels: Record<string, string> = {
      'URGENT': 'Urgent',
      'IMPORTANT': 'Important',
      'OTHERS': 'Others'
    };
    
    setToast({
      show: true,
      message: `Moved to ${categoryLabels[newCategory] || newCategory}`,
      threadIds: [threadId],
      emailIds: [],
      timeoutId: null
    });
    
    // Auto-hide toast after 3 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  }, [activeCategory]);

  // ==================== EMAIL SEND HANDLERS ====================
  
  // Called when email is queued for sending
  const handleEmailSent = useCallback((emailId: string, recipients: string[], emailData: UndoEmailData) => {
    console.log('📧 Email queued, showing undo toast:', emailId);
    setEmailUndoToast({
      show: true,
      emailId,
      recipients,
      emailData
    });
  }, []);
  
  // Called when user successfully undoes the email - just store data
  const handleEmailUndone = useCallback(() => {
    console.log('↩️ Email cancelled, storing data for modal');
    
    // v6.0: Clear optimistic reply since email was cancelled
    setOptimisticReply(null);
    
    // Get stored email data
    const emailData = emailUndoToast?.emailData;
    if (!emailData) return;
    
    // Store undo data - useEffect below will open the appropriate modal
    setUndoComposeData(emailData);
    
    // Also set up reply/forward state if needed (so modal has originalEmail)
    if (emailData.type === 'reply' && emailData.originalEmail) {
      setReplyToEmail(emailData.originalEmail as Email);
      setReplyMode(emailData.replyMode || 'reply');
    } else if (emailData.type === 'forward' && emailData.originalEmail) {
      setForwardEmail(emailData.originalEmail as Email);
    }
  }, [emailUndoToast]);

  // Open modal AFTER undoComposeData is set (fixes timing issue)
  useEffect(() => {
    if (undoComposeData) {
      console.log('📧 Opening modal with undo data, type:', undoComposeData.type);
      if (undoComposeData.type === 'compose') {
        setIsComposeOpen(true);
      } else if (undoComposeData.type === 'reply') {
        setIsReplyOpen(true);
      } else if (undoComposeData.type === 'forward') {
        setIsForwardOpen(true);
      }
    }
  }, [undoComposeData]);
  
  // Called when undo toast closes (timer expired or manually closed)
  const handleCloseEmailUndoToast = useCallback(() => {
    setEmailUndoToast(null);
  }, []);

  // ==================== REPLY/FORWARD HANDLERS ====================
  
  // Handle Reply button click - v4.0: Now accepts mode parameter
  const handleReply = useCallback((email: Email, mode: 'reply' | 'replyAll' = 'reply') => {
    console.log('📧 Opening reply modal for:', email.senderEmail, 'mode:', mode);
    setReplyToEmail(email);
    setReplyMode(mode);
    setIsReplyOpen(true);
  }, []);

  // Handle Forward button click
  const handleForward = useCallback((email: Email) => {
    console.log('📧 Opening forward modal for:', email.subject);
    setForwardEmail(email);
    setIsForwardOpen(true);
  }, []);

  // v6.0: Handle reply sent - add optimistic email to thread
  const handleReplySent = useCallback((optimisticEmail: Email) => {
    if (!selectedThread) return;
    
    console.log('📧 Adding optimistic reply to thread:', selectedThread.thread_id);
    setOptimisticReply({
      email: optimisticEmail,
      threadId: selectedThread.thread_id
    });
    
    // Safety timeout - clear after 60 seconds if webhook hasn't synced
    setTimeout(() => {
      setOptimisticReply(prev => {
        // Only clear if it's the same optimistic email
        if (prev && prev.email.id === optimisticEmail.id) {
          console.log('⏰ Clearing optimistic reply (timeout)');
          return null;
        }
        return prev;
      });
    }, 60000);
  }, [selectedThread]);

  

  // ==================== CONTEXT MENU HANDLERS ====================

  // Handle reply from context menu
  const handleContextReply = useCallback(async (thread: Thread) => {
    console.log('📧 Context Reply triggered for thread:', thread.thread_id);
    setSelectedThread(thread);
    
    if (!thread.email_ids?.length) {
      console.error('No email_ids in thread');
      return;
    }
    
    const extractEmailAddr = (str: string): string => {
      if (!str) return '';
      const match = str.match(/<([^>]+)>/);
      return match ? match[1] : str;
    };
    
    try {
      const emailId = thread.email_ids[thread.email_ids.length - 1];
      console.log('📧 Fetching email:', emailId);
      
      const data = await getEmail(emailId);
      console.log('📧 Email data received:', data);
      
      const email: Email = {
        id: data.id,
        sender: data.sender_name || data.from || '',
        senderEmail: data.sender_email || extractEmailAddr(data.from) || '',
        subject: data.subject || '',
        preview: data.snippet || '',
        body: data.body_html || data.body_text || '',
        time: '',
        date: data.date || '',
        isRead: data.is_read || false,
        hasAttachment: data.hasAttachment || false,
        thread_id: data.thread_id,
        to: data.to || [],
        message_id: data.message_id
      };
      
      setReplyToEmail(email);
      setReplyMode('reply');
      setIsReplyOpen(true);
      console.log('📧 Reply modal should open now');
    } catch (err) {
      console.error('📧 Error fetching email for reply:', err);
    }
  }, []);

  // Handle reply all from context menu
  const handleContextReplyAll = useCallback(async (thread: Thread) => {
    console.log('📧 Context Reply All triggered for thread:', thread.thread_id);
    setSelectedThread(thread);

    if (!thread.email_ids?.length) {
      console.error('No email_ids in thread');
      return;
    }

    const extractEmailAddr = (str: string): string => {
      if (!str) return '';
      const match = str.match(/<([^>]+)>/);
      return match ? match[1] : str;
    };
    
    try {
      const emailId = thread.email_ids[thread.email_ids.length - 1];
      console.log('📧 Fetching email:', emailId);
      
      const data = await getEmail(emailId);
      console.log('📧 Email data received:', data);
      
      const email: Email = {
        id: data.id,
        sender: data.sender_name || data.from || '',
        senderEmail: data.sender_email || extractEmailAddr(data.from) || '',
        subject: data.subject || '',
        preview: data.snippet || '',
        body: data.body_html || data.body_text || '',
        time: '',
        date: data.date || '',
        isRead: data.is_read || false,
        hasAttachment: data.hasAttachment || false,
        thread_id: data.thread_id,
        to: data.to || [],
        message_id: data.message_id
      };
      
      setReplyToEmail(email);
      setReplyMode('replyAll');
      setIsReplyOpen(true);
      console.log('📧 Reply All modal should open now');
    } catch (err) {
      console.error('📧 Error fetching email for reply all:', err);
    }
  }, []);

  // Handle forward from context menu
  const handleContextForward = useCallback(async (thread: Thread) => {
    console.log('📧 Context Forward triggered for thread:', thread.thread_id);
    setSelectedThread(thread);
    
    if (!thread.email_ids?.length) {
      console.error('No email_ids in thread');
      return;
    }
    
    try {
      const emailId = thread.email_ids[thread.email_ids.length - 1];
      console.log('📧 Fetching email:', emailId);
      
      const data = await getEmail(emailId);
      console.log('📧 Email data received:', data);
      
      const email: Email = {
        id: data.id,
        sender: data.sender_name || data.from || '',
        senderEmail: data.sender_email || '',
        subject: data.subject || '',
        preview: data.snippet || '',
        body: data.body_html || data.body_text || '',
        time: '',
        date: data.date || '',
        isRead: data.is_read || false,
        hasAttachment: data.hasAttachment || false,
        thread_id: data.thread_id,
        to: data.to || [],
        message_id: data.message_id
      };
      
      setForwardEmail(email);
      setIsForwardOpen(true);
      console.log('📧 Forward modal should open now');
    } catch (err) {
      console.error('📧 Error fetching email for forward:', err);
    }
  }, []);

  // Handle mark as read from context menu
  const handleContextMarkRead = useCallback(async (thread: Thread) => {
    setLocalReadThreads(prev => new Set(prev).add(thread.thread_id));
    setLocalUnreadThreads(prev => {
      const newSet = new Set(prev);
      newSet.delete(thread.thread_id);
      return newSet;
    });
    
    const emailIds = thread.email_ids || [];
    if (emailIds.length > 0) {
      batchMarkAsRead(emailIds).catch(console.error);
    }
  }, []);

  // Handle mark as unread from context menu
  const handleContextMarkUnread = useCallback(async (thread: Thread) => {
    setLocalUnreadThreads(prev => new Set(prev).add(thread.thread_id));
    setLocalReadThreads(prev => {
      const newSet = new Set(prev);
      newSet.delete(thread.thread_id);
      return newSet;
    });
    
    const emailIds = thread.email_ids || [];
    if (emailIds.length > 0) {
      batchMarkAsUnread(emailIds).catch(console.error);
    }
  }, []);


  // Handle create label from context menu
  const handleCreateLabelFromContext = useCallback(() => {
    setIsCreateLabelOpen(true);
  }, []);

  // Handle label created - refresh labels list
  const handleLabelCreatedFromContext = useCallback(async () => {
    try {
      const data = await getLabels();
      const labels = (data.labels || []).map((l) => ({
        id: l.id,
        name: l.display_name || l.name,
        color: l.color || '#8FA8A3'
      }));
      setAllLabels(labels);
    } catch (err) {
      console.error('Error refreshing labels:', err);
    }
  }, []);

  const handleToggleLabel = useCallback(async (thread: Thread, labelId: string, labelName: string, isApplied: boolean) => {
    console.log('🏷️ Toggle label:', labelName, 'isApplied:', isApplied, 'thread:', thread.thread_id);
    
    // Find the label object from allLabels
    const labelObj = allLabels.find(l => l.id === labelId);
    if (!labelObj) {
      console.error('Label not found:', labelId);
      return;
    }
    
    // Optimistic UI update
    setLocalThreadLabels(prev => {
      const newMap = new Map(prev);
      const currentLabels = newMap.get(thread.thread_id) || (thread as Thread & { labels?: Array<{ id: string; name: string; color: string }> }).labels || [];
      
      if (isApplied) {
        // Remove label
        const updatedLabels = currentLabels.filter((l) => l.id !== labelId);
        newMap.set(thread.thread_id, updatedLabels);
      } else {
        // Add label
        const updatedLabels = [...currentLabels, labelObj];
        newMap.set(thread.thread_id, updatedLabels);
      }
      
      return newMap;
    });
    
    try {
      if (isApplied) {
        await removeLabelFromThread({
          thread_id: thread.thread_id,
          label_id: labelId,
          label_name: labelName
        });
      } else {
        await applyLabelToThread({
          thread_id: thread.thread_id,
          label_id: labelId,
          label_name: labelName
        });
      }
      console.log('✅ Label toggled successfully');
    } catch (err) {
      console.error('❌ Label toggle failed:', err);
      // Revert optimistic update on error
      setLocalThreadLabels(prev => {
        const newMap = new Map(prev);
        newMap.delete(thread.thread_id);
        return newMap;
      });
    }
  }, [allLabels]);

  // ==================== KEYBOARD SHORTCUTS ====================
  
  // Existing keyboard shortcuts for checkbox selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      
      // Don't trigger if typing in any input, textarea, or contenteditable
      if (target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'checkbox') return;
      if (target.closest('[contenteditable="true"]')) return;
      
      // Don't trigger if inside any modal
      if (target.closest('[role="dialog"]') || target.closest('.compose-modal') || target.closest('[data-modal]')) return;
      
      // Don't trigger if any modal is open (state check as backup)
      if (isComposeOpen || isReplyOpen || isForwardOpen || isSearchOpen) return;
      
      // "/" key to open search
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const allIds = new Set(currentThreads.map(t => t.thread_id));
        setCheckedThreads(allIds);
        setIsSelectionMode(true);
        return;
      }
      
      if (e.key === 'Escape' && checkedThreads.size > 0) {
        e.preventDefault();
        setCheckedThreads(new Set());
        setIsSelectionMode(false);
        return;
      }
      
      if (checkedThreads.size === 0) return;
      
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        (document.activeElement as HTMLElement)?.blur();
        handleBatchMarkAsRead();
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        (document.activeElement as HTMLElement)?.blur();
        handleBatchMarkAsUnread();
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        (document.activeElement as HTMLElement)?.blur();
        handleBatchMarkAsDone();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        (document.activeElement as HTMLElement)?.blur();
        handleBatchDelete();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [checkedThreads, currentThreads, isComposeOpen, isReplyOpen, isForwardOpen, isSearchOpen, handleBatchMarkAsRead, handleBatchMarkAsUnread, handleBatchMarkAsDone, handleBatchDelete]);

  // v4.0: Keyboard shortcuts for Reply/Reply All/Forward (when viewing thread)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or editable area
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (target.tagName === 'INPUT') return;
      if (target.closest('[contenteditable="true"]')) return;
      
      // Don't trigger if inside any modal
      if (target.closest('[role="dialog"]') || target.closest('.compose-modal') || target.closest('[data-modal]')) return;
      
      // Don't trigger if any modal is open (state check as backup)
      if (isComposeOpen || isReplyOpen || isForwardOpen) return;
      
      // Only handle when thread is selected and no checkboxes selected
      if (!selectedThread || checkedThreads.size > 0) return;
      
      // Get latest email from threadEmails
      const latestEmail = threadEmails.length > 0 ? threadEmails[threadEmails.length - 1] : null;
      if (!latestEmail) return;
      
      // R+A for Reply All (check if A is pressed while R was recently pressed)
      if (e.key.toLowerCase() === 'a' && lastKeyRef.current === 'r') {
        e.preventDefault();
        handleReply(latestEmail, 'replyAll');
        lastKeyRef.current = null;
        return;
      }
      
      // R for Reply
      if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        lastKeyRef.current = 'r';
        // Set timeout to clear if A is not pressed
        setTimeout(() => {
          if (lastKeyRef.current === 'r') {
            handleReply(latestEmail, 'reply');
            lastKeyRef.current = null;
          }
        }, 300);
        return;
      }
      
      // F for Forward
      if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleForward(latestEmail);
        return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedThread, checkedThreads.size, threadEmails, isComposeOpen, isReplyOpen, isForwardOpen, handleReply, handleForward]);

  // ==================== RENDERING ====================

  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-[#1a1a1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!currentUser) return null;

  const isPromisesView = activeCategory === 'promises';
  const isAwaitingView = activeCategory === 'awaiting';
  const hasThreadSelection = selectedThread !== null;
  const hasCheckedThreads = checkedThreads.size > 0;
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  // Get mode for ThreadDetail
  const getThreadMode = () => {
    if (isAwaitingView) return 'awaiting';
    if (isPromisesView) return 'promise';
    return 'inbox';
  };

  return (
    <>
      {/* Composio Connection Overlay */}
      {needsComposioConnection && (
        <ComposioConnectionOverlay userEmail={currentUser?.email || ""} />
      )}

      {/* Sync Loading Overlay - Shows for 10 seconds after auth */}
      {showSyncLoading && (
        <SyncLoadingOverlay onHide={() => setShowSyncLoading(false)} />
      )}

      {/* Global styles */}

      <div 
        className={`fixed inset-0 bg-[#1a1a1a] ${needsComposioConnection ? 'blur-sm pointer-events-none' : ''}`} 
      >
      <Sidebar 
          activePage="inbox"
          userEmail={currentUser?.email || ""}
          userName={userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ""}`.trim() : undefined}
          avatarLetter={userProfile?.firstName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || "U"}
        />

        {/* ==================== MOBILE/TABLET: Sidebar Component ==================== */}
        <MobileSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activePage="inbox"
          userProfile={userProfile}
          currentUser={currentUser}
        />

        {/* ==================== MAIN CONTAINER ==================== */}
        <div className={`
          fixed inset-0 lg:top-0 lg:right-0 lg:left-16 bg-[#2d2d2d] lg:rounded-bl-2xl flex flex-col
          ${(hasCheckedThreads || isComposeOpen || isReplyOpen || isForwardOpen || hasThreadSelection) ? 'lg:bottom-12' : 'lg:bottom-8'}
        `}>
          
          {/* ==================== MOBILE SELECTION BAR ==================== */}
          <MobileSelectionBar
            selectedCount={checkedThreads.size}
            totalCount={currentThreads.length}
            isAllSelected={checkedThreads.size > 0 && checkedThreads.size === currentThreads.length}
            onSelectAll={handleGlobalCheckChange}
            onMarkRead={handleBatchMarkAsRead}
            onMarkUnread={handleBatchMarkAsUnread}
            onMarkDone={handleBatchMarkAsDone}
            onDelete={handleBatchDelete}
          />
          
          {/* ==================== TOP NAVBAR ==================== */}
          <nav className="flex-shrink-0 border-b border-zinc-700/50">
            {/* Mobile/Tablet Header */}
            <div className="flex lg:hidden items-center justify-between h-14 px-3">
              <div className="flex items-center">
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <CategoryDropdown 
                  activeCategory={activeCategory}
                  onCategoryChange={handleCategoryChange}
                  counts={categoryCounts}
                />
              </div>
              <div className="flex items-center">
                <button onClick={() => setIsSearchOpen(true)} className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white" title="Search">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                    <path d="M480 272C480 317.9 465.1 360.3 440 394.7L566.6 521.4C579.1 533.9 579.1 554.2 566.6 566.7C554.1 579.2 533.8 579.2 521.3 566.7L394.7 440C360.3 465.1 317.9 480 272 480C157.1 480 64 386.9 64 272C64 157.1 157.1 64 272 64C386.9 64 480 157.1 480 272zM272 416C351.5 416 416 351.5 416 272C416 192.5 351.5 128 272 128C192.5 128 128 192.5 128 272C128 351.5 192.5 416 272 416z"/>
                  </svg>
                </button>
                <button 
                  onClick={() => setIsComposeOpen(true)}
                  className="p-2 bg-[#8FA8A3] hover:bg-[#7a9691] rounded-lg transition-colors text-white"
                  title="Compose"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                    <path d="M505 122.9L517.1 135C526.5 144.4 526.5 159.6 517.1 168.9L488 198.1L441.9 152L471 122.9C480.4 113.5 495.6 113.5 504.9 122.9zM273.8 320.2L408 185.9L454.1 232L319.8 366.2C316.9 369.1 313.3 371.2 309.4 372.3L250.9 389L267.6 330.5C268.7 326.6 270.8 323 273.7 320.1zM437.1 89L239.8 286.2C231.1 294.9 224.8 305.6 221.5 317.3L192.9 417.3C190.5 425.7 192.8 434.7 199 440.9C205.2 447.1 214.2 449.4 222.6 447L322.6 418.4C334.4 415 345.1 408.7 353.7 400.1L551 202.9C579.1 174.8 579.1 129.2 551 101.1L538.9 89C510.8 60.9 465.2 60.9 437.1 89zM152 128C103.4 128 64 167.4 64 216L64 488C64 536.6 103.4 576 152 576L424 576C472.6 576 512 536.6 512 488L512 376C512 362.7 501.3 352 488 352C474.7 352 464 362.7 464 376L464 488C464 510.1 446.1 528 424 528L152 528C129.9 528 112 510.1 112 488L112 216C112 193.9 129.9 176 152 176L264 176C277.3 176 288 165.3 288 152C288 138.7 277.3 128 264 128L152 128z"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Desktop Header */}
            <div className="hidden lg:flex items-center justify-between px-6 pt-4">
              <div className="flex items-center gap-4">
                <div className="pb-4">
                  <div className="h-5 flex items-center">
                    <input
                      type="checkbox"
                      checked={checkedThreads.size > 0 && checkedThreads.size === currentThreads.length}
                      onChange={handleGlobalCheckChange}
                      className="w-4 h-4 rounded bg-transparent cursor-pointer appearance-none border-2 border-zinc-500 outline-none focus:outline-none focus:ring-0 relative checked:after:content-['✓'] checked:after:absolute checked:after:text-white checked:after:text-xs checked:after:font-bold checked:after:left-1/2 checked:after:top-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2"
                    />
                  </div>
                </div>
                <CategoryNav 
                  activeCategory={activeCategory}
                  onCategoryChange={handleCategoryChange}
                  counts={categoryCounts}
                />
              </div>
              <div className="flex items-center gap-1 pb-4">
                {/* Batch Action Icons - Only show when threads selected */}
                {checkedThreads.size > 0 && (
                  <>
                    {/* Mark Read */}
                    <button
                      onClick={handleBatchMarkAsRead}
                      className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
                      title="Mark as read"
                    >
                      <MailOpen className="w-5 h-5" />
                    </button>
                    {/* Mark Unread */}
                    <button
                      onClick={handleBatchMarkAsUnread}
                      className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
                      title="Mark as unread"
                    >
                      <Mail className="w-5 h-5" />
                    </button>
                    {/* Mark Done */}
                    <button
                      onClick={handleBatchMarkAsDone}
                      className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
                      title="Mark as done"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    {/* Delete */}
                    <button
                      onClick={handleBatchDelete}
                      className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    {/* Divider */}
                    <div className="w-px h-5 bg-zinc-700 mx-1" />
                  </>
                )}
                
                <button onClick={() => setIsSearchOpen(true)} className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white" title="Search">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                    <path d="M480 272C480 317.9 465.1 360.3 440 394.7L566.6 521.4C579.1 533.9 579.1 554.2 566.6 566.7C554.1 579.2 533.8 579.2 521.3 566.7L394.7 440C360.3 465.1 317.9 480 272 480C157.1 480 64 386.9 64 272C64 157.1 157.1 64 272 64C386.9 64 480 157.1 480 272zM272 416C351.5 416 416 351.5 416 272C416 192.5 351.5 128 272 128C192.5 128 128 192.5 128 272C128 351.5 192.5 416 272 416z"/>
                  </svg>
                </button>
                <button 
                  onClick={() => setIsComposeOpen(true)}
                  className="p-2 bg-[#8FA8A3] hover:bg-[#7a9691] rounded-lg transition-colors text-white"
                  title="Compose"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                    <path d="M505 122.9L517.1 135C526.5 144.4 526.5 159.6 517.1 168.9L488 198.1L441.9 152L471 122.9C480.4 113.5 495.6 113.5 504.9 122.9zM273.8 320.2L408 185.9L454.1 232L319.8 366.2C316.9 369.1 313.3 371.2 309.4 372.3L250.9 389L267.6 330.5C268.7 326.6 270.8 323 273.7 320.1zM437.1 89L239.8 286.2C231.1 294.9 224.8 305.6 221.5 317.3L192.9 417.3C190.5 425.7 192.8 434.7 199 440.9C205.2 447.1 214.2 449.4 222.6 447L322.6 418.4C334.4 415 345.1 408.7 353.7 400.1L551 202.9C579.1 174.8 579.1 129.2 551 101.1L538.9 89C510.8 60.9 465.2 60.9 437.1 89zM152 128C103.4 128 64 167.4 64 216L64 488C64 536.6 103.4 576 152 576L424 576C472.6 576 512 536.6 512 488L512 376C512 362.7 501.3 352 488 352C474.7 352 464 362.7 464 376L464 488C464 510.1 446.1 528 424 528L152 528C129.9 528 112 510.1 112 488L112 216C112 193.9 129.9 176 152 176L264 176C277.3 176 288 165.3 288 152C288 138.7 277.3 128 264 128L152 128z"/>
                  </svg>
                </button>
              </div>
            </div>
          </nav>

          {/* ==================== MAIN CONTENT AREA ==================== */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* ===== LIST PANEL ===== */}
            <div 
              className={`
                overflow-y-auto hide-scrollbar
                ${hasThreadSelection && !isExpanded ? 'hidden lg:block lg:w-[30%] lg:border-r lg:border-zinc-700/50' : 'w-full'}
              `}
            >
              {/* PROMISES - Use existing PromiseList */}
              {isPromisesView && (
                <PromiseList
                  threads={currentThreads}
                  loading={currentLoading}
                  error={currentError}
                  selectedThread={selectedThread}
                  onThreadClick={handleThreadClick}
                  checkedThreadIds={checkedThreads}
                  onCheckChange={handleCheckChange}
                />
              )}
              
              {/* AWAITING - Use existing AwaitingList */}
              {isAwaitingView && (
                <AwaitingList
                  threads={currentThreads}
                  loading={currentLoading}
                  error={currentError}
                  selectedThread={selectedThread}
                  onThreadClick={handleThreadClick}
                  checkedThreadIds={checkedThreads}
                  onCheckChange={handleCheckChange}
                />
              )}
              
              {/* URGENT/IMPORTANT/OTHERS - Use new ThreadList */}
              {!isPromisesView && !isAwaitingView && (
                <ThreadList
                  threads={currentThreads}
                  loading={currentLoading}
                  error={currentError}
                  selectedThreadId={selectedThread?.thread_id || null}
                  isCompact={hasThreadSelection && !isExpanded}
                  checkedThreadIds={checkedThreads}
                  isSelectionMode={isSelectionMode}
                  onThreadClick={handleThreadClick}
                  onCheckChange={handleCheckChange}
                  onLongPress={handleLongPress}
                  onMarkDone={handleMarkThreadDone}
                  onDelete={handleDeleteThread}
                  allLabels={allLabels}
                  onReply={handleContextReply}
                  onReplyAll={handleContextReplyAll}
                  onForward={handleContextForward}
                  onMarkRead={handleContextMarkRead}
                  onMarkUnread={handleContextMarkUnread}
                  onToggleLabel={handleToggleLabel}
                  onCreateLabel={handleCreateLabelFromContext}
                />
              )}
            </div>

            {/* ===== DETAIL PANEL ===== */}
            <div 
              className={`
                hidden lg:flex flex-col bg-[#2d2d2d] overflow-hidden
                ${hasThreadSelection && !isExpanded ? 'w-[55%]' : 'w-0'}
              `}
            >
              {hasThreadSelection && selectedThread && (
                <ThreadDetail 
                  thread={selectedThread}
                  emails={displayEmails}
                  loading={threadEmailsLoading}
                  userEmail={currentUser?.email || ''}
                  onClose={handleCloseDetail}
                  onMarkDone={() => handleMarkThreadDone(selectedThread)}
                  onDelete={() => handleDeleteThread(selectedThread)}
                  onExpand={handleToggleExpand}
                  isExpanded={false}
                  onPrevious={handlePreviousThread}
                  onNext={handleNextThread}
                  hasPrevious={hasPreviousThread}
                  hasNext={hasNextThread}
                  mode={getThreadMode()}
                  onReply={handleReply}
                  onForward={handleForward}
                  getAuthToken={getAuthToken}
                  onCategoryChange={handleThreadCategoryOverride}
                />
              )}
              
              {!selectedThread && (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-zinc-500 text-sm">Select a thread to view</p>
                </div>
              )}
            </div>

            {/* ===== PROFILE PANEL ===== */}
            <div 
              className={`
                hidden lg:flex flex-col bg-[#2d2d2d] border-l border-zinc-700/50 overflow-hidden
                ${hasThreadSelection && !isExpanded ? 'w-[15%]' : 'w-0'}
              `}
            >
              {hasThreadSelection && selectedThread && (
                <div className="p-6 pt-8">
                  <div className="mb-4">
                    <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Participants</p>
                    <div className="space-y-1.5">
                      {(() => {
                        const participants = new Set<string>();
                        
                        // Helper: Extract email from "Name <email>" format
                        const extractEmailAddress = (str: string): string => {
                          if (!str) return '';
                          const match = str.match(/<(.+)>/);
                          return match ? match[1] : str;
                        };
                        
                        threadEmails.forEach(email => {
                          // Add sender (already just email)
                          if (email.senderEmail) participants.add(email.senderEmail);
                          // Add recipients - extract email from "Name <email>" format
                          if (email.to && Array.isArray(email.to)) {
                            email.to.forEach((recipient: string) => {
                              const emailAddr = extractEmailAddress(recipient);
                              if (emailAddr) participants.add(emailAddr);
                            });
                          }
                        });
                        
                        return Array.from(participants).map((email, idx) => (
                          <p key={idx} className="text-zinc-300 text-sm break-all">
                            {email}
                          </p>
                        ));
                      })()}
                      {threadEmails.length === 0 && (
                        <p className="text-zinc-500 text-sm italic">Loading...</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Thread</p>
                    <p className="text-zinc-300 text-sm">
                      {selectedThread.email_ids?.length || threadEmails.length || 0} emails
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ===== MOBILE: Full screen thread detail ===== */}
            {hasThreadSelection && selectedThread && (
              <MobileThreadDetail 
                thread={selectedThread}
                emails={displayEmails}
                loading={threadEmailsLoading}
                userEmail={currentUser?.email || ''}
                onClose={handleCloseDetail}
                onMarkDone={() => handleMarkThreadDone(selectedThread)}
                onDelete={() => handleDeleteThread(selectedThread)}
                mode={getThreadMode()}
                onReply={handleReply}
                onForward={handleForward}
                getAuthToken={getAuthToken}
              />
            )}
          </div>
          
        </div>
        
        {/* ==================== KEYBOARD SHORTCUTS BAR ==================== */}
        {/* Compose shortcuts - when compose or reply modal is open */}
        {(isComposeOpen || isReplyOpen || isForwardOpen) && (
          <div className="hidden lg:flex fixed bottom-0 left-16 right-0 h-12 bg-[#1a1a1a] items-center justify-center gap-8 z-20">
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">{isMac ? '⌘' : 'Ctrl'}+B</kbd>
              <span className="text-sm text-zinc-400">Bold</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">{isMac ? '⌘' : 'Ctrl'}+I</kbd>
              <span className="text-sm text-zinc-400">Italic</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">{isMac ? '⌘' : 'Ctrl'}+U</kbd>
              <span className="text-sm text-zinc-400">Underline</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">{isMac ? '⌘' : 'Ctrl'}+K</kbd>
              <span className="text-sm text-zinc-400">Link</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">{isMac ? '⌘' : 'Ctrl'}+Enter</kbd>
              <span className="text-sm text-zinc-400">Send</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">Esc</kbd>
              <span className="text-sm text-zinc-400">Close</span>
            </div>
          </div>
        )}
        
        {/* Checkbox shortcuts - when threads are checked */}
        {!isComposeOpen && !isReplyOpen && !isForwardOpen && hasCheckedThreads && (
          <div className="hidden lg:flex fixed bottom-0 left-16 right-0 h-12 bg-[#1a1a1a] items-center justify-center gap-8 z-20">
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">R</kbd>
              <span className="text-sm text-zinc-400">Read</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">U</kbd>
              <span className="text-sm text-zinc-400">Unread</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">D</kbd>
              <span className="text-sm text-zinc-400">Done</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">Del</kbd>
              <span className="text-sm text-zinc-400">Delete</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">{isMac ? '⌘' : 'Ctrl'}+A</kbd>
              <span className="text-sm text-zinc-400">Select All</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">Esc</kbd>
              <span className="text-sm text-zinc-400">Deselect</span>
            </div>
          </div>
        )}
        
        {/* v4.0: Reply/Forward shortcuts - when viewing thread (no checkboxes, no modals) */}
        {!isComposeOpen && !isReplyOpen && !isForwardOpen && !hasCheckedThreads && hasThreadSelection && (
          <div className="hidden lg:flex fixed bottom-0 left-16 right-0 h-12 bg-[#1a1a1a] items-center justify-center gap-8 z-20">
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">R</kbd>
              <span className="text-sm text-zinc-400">Reply</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">R+A</kbd>
              <span className="text-sm text-zinc-400">Reply All</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">F</kbd>
              <span className="text-sm text-zinc-400">Forward</span>
            </div>
          </div>
        )}
        
        {/* ==================== EXPANDED OVERLAY ==================== */}
        {isExpanded && hasThreadSelection && selectedThread && (
          <>
            <div 
              className="hidden lg:block fixed inset-0 bg-black/60 z-50"
              onClick={handleCloseExpanded}
            />
            
            <div className="hidden lg:flex fixed inset-0 items-center justify-center z-50 pointer-events-none p-8">
              <div 
                className="pointer-events-auto flex bg-[#2d2d2d] rounded-2xl shadow-2xl overflow-hidden"
                style={{ width: '80%', maxWidth: '1200px', height: '85vh' }}
              >
                <div className="flex-1 flex flex-col overflow-hidden">
                  <ThreadDetail 
                    thread={selectedThread}
                    emails={displayEmails}
                    loading={threadEmailsLoading}
                    userEmail={currentUser?.email || ''}
                    onClose={handleCloseExpanded}
                    onMarkDone={() => handleMarkThreadDone(selectedThread)}
                    onDelete={() => handleDeleteThread(selectedThread)}
                    onExpand={handleToggleExpand}
                    isExpanded={true}
                    onPrevious={handlePreviousThread}
                    onNext={handleNextThread}
                    hasPrevious={hasPreviousThread}
                    hasNext={hasNextThread}
                    mode={getThreadMode()}
                    onReply={handleReply}
                    onForward={handleForward}
                    getAuthToken={getAuthToken}
                    onCategoryChange={handleThreadCategoryOverride}
                  />
                </div>
                
                <div className="w-64 bg-[#2d2d2d] border-l border-zinc-700/50 flex-shrink-0 overflow-y-auto">
                  <div className="p-6 pt-8">
                    <div className="mb-4">
                      <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Participants</p>
                      <div className="space-y-1.5">
                        {(() => {
                          const participants = new Set<string>();
                          
                          // Helper: Extract email from "Name <email>" format
                          const extractEmailAddress = (str: string): string => {
                            if (!str) return '';
                            const match = str.match(/<(.+)>/);
                            return match ? match[1] : str;
                          };
                          
                          threadEmails.forEach(email => {
                            // Add sender (already just email)
                            if (email.senderEmail) participants.add(email.senderEmail);
                            // Add recipients - extract email from "Name <email>" format
                            if (email.to && Array.isArray(email.to)) {
                              email.to.forEach((recipient: string) => {
                                const emailAddr = extractEmailAddress(recipient);
                                if (emailAddr) participants.add(emailAddr);
                              });
                            }
                          });
                          
                          return Array.from(participants).map((email, idx) => (
                            <p key={idx} className="text-zinc-300 text-sm break-all">{email}</p>
                          ));
                        })()}
                      </div>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Thread</p>
                      <p className="text-zinc-300 text-sm">{selectedThread.email_ids?.length || 0} emails</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* Toast for undo delete */}
        {toast.show && (
          <UndoToast
            message={toast.message}
            onUndo={handleUndoDelete}
            onClose={handleCloseToast}
          />
        )}
        
        {/* Compose Modal */}
        <ComposeModal
          key={undoComposeData?.type === 'compose' ? 'undo' : 'normal'}
          isOpen={isComposeOpen}
          onClose={() => {
            setIsComposeOpen(false);
            setUndoComposeData(null); // Clear undo data when modal closes
          }}
          userEmail={currentUser?.email || ''}
          userTimezone={backendUserData?.timezone}
          onEmailSent={handleEmailSent}
          // Undo restore: pass initial values if available
          initialTo={undoComposeData?.type === 'compose' ? undoComposeData.to : undefined}
          initialCc={undoComposeData?.type === 'compose' ? undoComposeData.cc : undefined}
          initialBcc={undoComposeData?.type === 'compose' ? undoComposeData.bcc : undefined}
          initialSubject={undoComposeData?.type === 'compose' ? undoComposeData.subject : undefined}
          initialBody={undoComposeData?.type === 'compose' ? undoComposeData.body_html : undefined}
          initialAttachments={undoComposeData?.type === 'compose' ? undoComposeData.attachments : undefined}
        />
        
        {/* Reply Modal */}
        {isReplyOpen && replyToEmail && (
          <ReplyModal
            key={undoComposeData?.type === 'reply' ? 'undo' : 'normal'}
            isOpen={isReplyOpen}
            onClose={() => {
              setIsReplyOpen(false);
              setUndoComposeData(null); // Clear undo data when modal closes
            }}
            mode={replyMode}
            originalEmail={replyToEmail}
            threadId={selectedThread?.thread_id || undoComposeData?.threadId || ''}
            threadSubject={selectedThread?.gmail_subject || ''}
            messageId={replyToEmail?.message_id || undoComposeData?.messageId}
            userEmail={currentUser?.email || ''}
            userTimezone={backendUserData?.timezone}
            onEmailSent={handleEmailSent}
            onReplySent={handleReplySent}
            // Undo restore: pass initial values if available
            initialTo={undoComposeData?.type === 'reply' ? undoComposeData.to : undefined}
            initialCc={undoComposeData?.type === 'reply' ? undoComposeData.cc : undefined}
            initialBody={undoComposeData?.type === 'reply' ? undoComposeData.body_html : undefined}
            initialAttachments={undoComposeData?.type === 'reply' ? undoComposeData.attachments : undefined}
          />
        )}
        
        {/* Forward Modal */}
        {isForwardOpen && forwardEmail && (
          <ForwardModal
            key={undoComposeData?.type === 'forward' ? 'undo' : 'normal'}
            isOpen={isForwardOpen}
            onClose={() => {
              setIsForwardOpen(false);
              setUndoComposeData(null); // Clear undo data when modal closes
            }}
            originalEmail={forwardEmail}
            threadId={selectedThread?.thread_id || undoComposeData?.threadId || ''}
            threadSubject={selectedThread?.gmail_subject || ''}
            userEmail={currentUser?.email || ''}
            userTimezone={backendUserData?.timezone}
            onEmailSent={handleEmailSent}
            // Undo restore: pass initial values if available
            initialTo={undoComposeData?.type === 'forward' ? undoComposeData.to : undefined}
            initialCc={undoComposeData?.type === 'forward' ? undoComposeData.cc : undefined}
            initialBody={undoComposeData?.type === 'forward' ? undoComposeData.body_html : undefined}
            initialAttachments={undoComposeData?.type === 'forward' ? undoComposeData.attachments : undefined}
          />
        )}
        
        {/* Email Send Undo Toast */}
        {emailUndoToast && emailUndoToast.show && (
          <EmailSendUndoToast
            emailId={emailUndoToast.emailId}
            recipients={emailUndoToast.recipients}
            onClose={handleCloseEmailUndoToast}
            onUndo={handleEmailUndone}
          />
        )}
        
        {/* Category Move Toast (Promise/Awaiting notifications) */}
        <CategoryMoveToast
          notifications={categoryMoveNotifications}
          onDismiss={dismissCategoryMoveNotification}
          autoHideDuration={3000}
        />
        
        {/* Search Modal */}
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          userEmail={currentUser?.email || ''}
        />
        
        {/* Create Label Modal (from context menu) */}
        <CreateLabelModal
          isOpen={isCreateLabelOpen}
          onClose={() => setIsCreateLabelOpen(false)}
          onLabelCreated={handleLabelCreatedFromContext}
        />
        
      </div>
    </>
  );
};

export default InboxPage;