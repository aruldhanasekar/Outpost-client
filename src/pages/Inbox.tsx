import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2, SendHorizontal, Menu, X } from "lucide-react";
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
} from "@/components/inbox";
import { useThreads } from "@/hooks/useThreads";
import { 
  batchMarkAsDone, 
  batchMarkAsRead,
  batchMarkAsUnread,
  batchDelete
} from "@/services/emailApi";
import { UndoToast } from "@/components/ui/UndoToast";
import { EmailSendUndoToast } from "@/components/ui/EmailSendUndoToast";
import { Sidebar } from "@/components/layout";
import ComposioConnectionOverlay from "@/components/ComposioConnectionOverlay";

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
  
  // Checked threads state (for bulk selection)
  const [checkedThreads, setCheckedThreads] = useState<Set<string>>(new Set());
  
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

  // Email send undo toast state
  const [emailUndoToast, setEmailUndoToast] = useState<{
    show: boolean;
    emailId: string;
    recipients: string[];
  } | null>(null);

  // Reply modal state
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyMode, setReplyMode] = useState<'reply' | 'replyAll'>('reply');
  const [replyToEmail, setReplyToEmail] = useState<Email | null>(null);

  // Forward modal state
  const [isForwardOpen, setIsForwardOpen] = useState(false);
  const [forwardEmail, setForwardEmail] = useState<Email | null>(null);

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
  
  // Fetch emails for selected thread
  const { 
    emails: threadEmails, 
    loading: threadEmailsLoading 
  } = useThreadEmails(
    currentUser?.uid,
    selectedThread?.email_ids || []
  );

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
      .map(thread => ({
        ...thread,
        // Apply local read/unread state
        is_read: localUnreadThreads.has(thread.thread_id)
          ? false  // Explicitly marked unread via checkbox
          : localReadThreads.has(thread.thread_id)
            ? true  // Clicked and marked read
            : thread.is_read  // From Firestore
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
    localReadThreads,
    localUnreadThreads
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
      return newSet;
    });
  }, []);
  
  const handleGlobalCheckChange = useCallback(() => {
    if (checkedThreads.size > 0) {
      setCheckedThreads(new Set());
    } else {
      const allIds = new Set(currentThreads.map(t => t.thread_id));
      setCheckedThreads(allIds);
    }
  }, [checkedThreads.size, currentThreads]);

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

  // ==================== EMAIL SEND HANDLERS ====================
  
  // Called when email is queued for sending
  const handleEmailSent = useCallback((emailId: string, recipients: string[]) => {
    console.log('📧 Email queued, showing undo toast:', emailId);
    setEmailUndoToast({
      show: true,
      emailId,
      recipients
    });
  }, []);
  
  // Called when user successfully undoes the email
  const handleEmailUndone = useCallback(() => {
    console.log('↩️ Email cancelled');
    // Toast will close itself
  }, []);
  
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
      if (isComposeOpen || isReplyOpen || isForwardOpen) return;
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const allIds = new Set(currentThreads.map(t => t.thread_id));
        setCheckedThreads(allIds);
        return;
      }
      
      if (e.key === 'Escape' && checkedThreads.size > 0) {
        e.preventDefault();
        setCheckedThreads(new Set());
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
  }, [checkedThreads, currentThreads, isComposeOpen, isReplyOpen, isForwardOpen, handleBatchMarkAsRead, handleBatchMarkAsUnread, handleBatchMarkAsDone, handleBatchDelete]);

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

        {/* ==================== MOBILE/TABLET: Overlay ==================== */}
        {sidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ==================== MOBILE/TABLET: Slide-out Sidebar ==================== */}
        <div className={`
          lg:hidden fixed top-0 left-0 bottom-0 w-72 bg-[#1a1a1a] z-50 
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-[#f7ac5c] flex items-center justify-center text-base font-semibold text-black flex-shrink-0">
                {currentUser?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-white text-sm font-medium truncate">
                  {currentUser?.email || "User"}
                </span>
                <span className="text-zinc-500 text-xs">Outpost</span>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Navigation */}
          <div className="p-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-3">
              Navigation
            </p>
            <div className="space-y-1">
              <button 
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white bg-zinc-800/50 w-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5 flex-shrink-0" fill="currentColor">
                  <path d="M155.8 96C123.9 96 96.9 119.4 92.4 150.9L64.6 345.2C64.2 348.2 64 351.2 64 354.3L64 480C64 515.3 92.7 544 128 544L512 544C547.3 544 576 515.3 576 480L576 354.3C576 351.3 575.8 348.2 575.4 345.2L547.6 150.9C543.1 119.4 516.1 96 484.2 96L155.8 96zM155.8 160L484.3 160L511.7 352L451.8 352C439.7 352 428.6 358.8 423.2 369.7L408.9 398.3C403.5 409.1 392.4 416 380.3 416L259.9 416C247.8 416 236.7 409.2 231.3 398.3L217 369.7C211.6 358.9 200.5 352 188.4 352L128.3 352L155.8 160z"/>
                </svg>
                <span className="text-sm font-medium">Inbox</span>
              </button>
              <button 
                onClick={() => { setSidebarOpen(false); navigate('/sent'); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/30 transition-colors"
              >
                <SendHorizontal className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">Sent</span>
              </button>
              <button 
                onClick={() => { setSidebarOpen(false); navigate('/drafts'); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/30 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5 flex-shrink-0" fill="currentColor">
                  <path d="M128 128C128 92.7 156.7 64 192 64L341.5 64C358.5 64 374.8 70.7 386.8 82.7L493.3 189.3C505.3 201.3 512 217.6 512 234.6L512 512C512 547.3 483.3 576 448 576L192 576C156.7 576 128 547.3 128 512L128 128zM336 122.5L336 216C336 229.3 346.7 240 360 240L453.5 240L336 122.5zM192 136C192 149.3 202.7 160 216 160L264 160C277.3 160 288 149.3 288 136C288 122.7 277.3 112 264 112L216 112C202.7 112 192 122.7 192 136zM192 232C192 245.3 202.7 256 216 256L264 256C277.3 256 288 245.3 288 232C288 218.7 277.3 208 264 208L216 208C202.7 208 192 218.7 192 232zM256 304L224 304C206.3 304 192 318.3 192 336L192 384C192 410.5 213.5 432 240 432C266.5 432 288 410.5 288 384L288 336C288 318.3 273.7 304 256 304zM240 368C248.8 368 256 375.2 256 384C256 392.8 248.8 400 240 400C231.2 400 224 392.8 224 384C224 375.2 231.2 368 240 368z"/>
                </svg>
                <span className="text-sm font-medium">Drafts</span>
              </button>
              <button 
                onClick={() => { setSidebarOpen(false); navigate('/done'); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/30 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5 flex-shrink-0" fill="currentColor">
                  <path d="M530.8 134.1C545.1 144.5 548.3 164.5 537.9 178.8L281.9 530.8C276.4 538.4 267.9 543.1 258.5 543.9C249.1 544.7 240 541.2 233.4 534.6L105.4 406.6C92.9 394.1 92.9 373.8 105.4 361.3C117.9 348.8 138.2 348.8 150.7 361.3L252.2 462.8L486.2 141.1C496.6 126.8 516.6 123.6 530.9 134z"/>
                </svg>
                <span className="text-sm font-medium">Done</span>
              </button>
              <button 
                onClick={() => { setSidebarOpen(false); navigate('/scheduled'); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/30 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5 flex-shrink-0" fill="currentColor">
                  <path d="M320 0C496.7 0 640 143.3 640 320C640 496.7 496.7 640 320 640C143.3 640 0 496.7 0 320C0 143.3 143.3 0 320 0ZM290 150V320C290 330 295 339.4 303.4 345L423.4 425C437.1 434.2 455.6 430.5 464.9 416.9C474.1 403.2 470.5 384.7 456.8 375.4L350 304.9V150C350 133.4 336.6 120 320 120C303.4 120 290 133.4 290 150Z"/>
                </svg>
                <span className="text-sm font-medium">Scheduled</span>
              </button>
              <button 
                onClick={() => { setSidebarOpen(false); navigate('/trash'); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/30 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5 flex-shrink-0" fill="currentColor">
                  <path d="M232.7 69.9L224 96L128 96C110.3 96 96 110.3 96 128C96 145.7 110.3 160 128 160L512 160C529.7 160 544 145.7 544 128C544 110.3 529.7 96 512 96L416 96L407.3 69.9C402.9 56.8 390.7 48 376.9 48L263.1 48C249.3 48 237.1 56.8 232.7 69.9zM512 208L128 208L149.1 531.1C150.7 556.4 171.7 576 197 576L443 576C468.3 576 489.3 556.4 490.9 531.1L512 208z"/>
                </svg>
                <span className="text-sm font-medium">Trash</span>
              </button>
            </div>
          </div>
        </div>

        {/* ==================== MAIN CONTAINER ==================== */}
        <div className={`
          fixed inset-0 lg:top-0 lg:right-0 lg:left-16 bg-[#2d2d2d] lg:rounded-bl-2xl flex flex-col
          ${(hasCheckedThreads || isComposeOpen || isReplyOpen || isForwardOpen || hasThreadSelection) ? 'lg:bottom-12' : 'lg:bottom-8'}
        `}>
          
          {/* ==================== TOP NAVBAR ==================== */}
          <nav className="flex-shrink-0 border-b border-zinc-700/50">
            {/* Mobile/Tablet Header */}
            <div className="flex lg:hidden items-center justify-between h-14 px-3">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8">
                  <input
                    type="checkbox"
                    checked={checkedThreads.size > 0 && checkedThreads.size === currentThreads.length}
                    onChange={handleGlobalCheckChange}
                    className="w-4 h-4 rounded bg-transparent cursor-pointer appearance-none border-2 border-zinc-500 outline-none focus:outline-none focus:ring-0 relative checked:after:content-['✓'] checked:after:absolute checked:after:text-white checked:after:text-xs checked:after:font-bold checked:after:left-1/2 checked:after:top-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2"
                  />
                </div>
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
                <button className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white">
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
                <button className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white">
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
                  onThreadClick={handleThreadClick}
                  onCheckChange={handleCheckChange}
                  onMarkDone={handleMarkThreadDone}
                  onDelete={handleDeleteThread}
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
                  emails={threadEmails}
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
                emails={threadEmails}
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
                    emails={threadEmails}
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
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
          userEmail={currentUser?.email || ''}
          onEmailSent={handleEmailSent}
        />
        
        {/* Reply Modal */}
        {isReplyOpen && replyToEmail && (
          <ReplyModal
            isOpen={isReplyOpen}
            onClose={() => setIsReplyOpen(false)}
            mode={replyMode}
            originalEmail={replyToEmail}
            threadId={selectedThread?.thread_id || ''}
            threadSubject={selectedThread?.gmail_subject || ''}
            messageId={replyToEmail?.message_id}
            userEmail={currentUser?.email || ''}
            onEmailSent={handleEmailSent}
          />
        )}
        
        {/* Forward Modal */}
        {isForwardOpen && forwardEmail && (
          <ForwardModal
            isOpen={isForwardOpen}
            onClose={() => setIsForwardOpen(false)}
            originalEmail={forwardEmail}
            threadId={selectedThread?.thread_id || ''}
            threadSubject={selectedThread?.gmail_subject || ''}
            userEmail={currentUser?.email || ''}
            onEmailSent={handleEmailSent}
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
        
      </div>
    </>
  );
};

export default InboxPage;