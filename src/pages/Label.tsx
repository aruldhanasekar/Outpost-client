// pages/Label.tsx - Label page showing emails with specific Gmail label
// EXACT same design as Inbox.tsx, just without category tabs

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, SendHorizontal, Menu, X, Tag } from "lucide-react";
import {
  Thread,
  Email,
  useThreadEmails,
  ThreadList,
  ThreadDetail,
  MobileThreadDetail,
  ComposeModal,
  ReplyModal,
  ForwardModal,
} from "@/components/inbox";
import { SearchModal } from "@/components/search";
import { UndoEmailData } from "@/components/inbox/ComposeModal";
import { 
  batchMarkAsDone, 
  batchMarkAsRead,
  batchMarkAsUnread,
  batchDelete
} from "@/services/emailApi";
import { UndoToast } from "@/components/ui/UndoToast";
import { EmailSendUndoToast } from "@/components/ui/EmailSendUndoToast";
import { Sidebar } from "@/components/layout";

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// Hook to fetch threads by label
function useLabelThreads(userId: string | undefined, labelName: string | undefined) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !labelName) {
      setLoading(false);
      return;
    }

    const fetchThreads = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // TODO: Replace with actual API call to fetch threads by label
        // For now, return empty array (sample implementation)
        // const response = await fetch(`${API_URL}/api/labels/${labelName}/threads`, {
        //   headers: { 'Authorization': `Bearer ${token}` }
        // });
        // const data = await response.json();
        // setThreads(data.threads || []);
        
        // Sample: empty for now until backend endpoint is ready
        setThreads([]);
      } catch (err) {
        console.error('Error fetching label threads:', err);
        setError('Failed to load emails');
      } finally {
        setLoading(false);
      }
    };

    fetchThreads();
  }, [userId, labelName]);

  return { threads, loading, error };
}

const LabelPage = () => {
  const { labelName } = useParams<{ labelName: string }>();
  const { currentUser, userProfile, loading: authLoading, backendUserData } = useAuth();
  const navigate = useNavigate();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Thread selection state
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

  // Undo restore state
  const [undoComposeData, setUndoComposeData] = useState<UndoEmailData | null>(null);

  // Ref for tracking last key pressed
  const lastKeyRef = useRef<string | null>(null);

  // Auth token getter
  const getAuthToken = useCallback(async (): Promise<string> => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    return currentUser.getIdToken();
  }, [currentUser]);

  // ==================== DATA FETCHING ====================
  
  // Fetch threads for this label
  const { 
    threads: labelThreads, 
    loading: labelLoading, 
    error: labelError 
  } = useLabelThreads(currentUser?.uid, labelName);
  
  // Fetch emails for selected thread
  const { 
    emails: threadEmails, 
    loading: threadEmailsLoading 
  } = useThreadEmails(
    currentUser?.uid,
    selectedThread?.email_ids || []
  );

  // ==================== COMPUTED STATE ====================
  
  // Get threads with local state applied
  const currentThreads = useMemo(() => {
    return labelThreads
      .filter(thread => !localDoneThreads.has(thread.thread_id))
      .filter(thread => !localDeletedThreads.has(thread.thread_id))
      .map(thread => ({
        ...thread,
        is_read: localUnreadThreads.has(thread.thread_id)
          ? false
          : localReadThreads.has(thread.thread_id)
            ? true
            : thread.is_read
      }));
  }, [labelThreads, localDoneThreads, localDeletedThreads, localReadThreads, localUnreadThreads]);

  // ==================== AUTH CHECK ====================

  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate("/");
    }
  }, [currentUser, authLoading, navigate]);

  // ==================== THREAD CLICK HANDLERS ====================

  const handleThreadClick = useCallback(async (thread: Thread) => {
    setSelectedThread(thread);
    
    if (localUnreadThreads.has(thread.thread_id)) {
      setLocalUnreadThreads(prev => {
        const newSet = new Set(prev);
        newSet.delete(thread.thread_id);
        return newSet;
      });
    }
    
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

  const handleCloseDetail = useCallback(() => {
    setSelectedThread(null);
    setIsExpanded(false);
  }, []);
  
  const handleCloseExpanded = useCallback(() => {
    setIsExpanded(false);
  }, []);
  
  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);
  
  // ==================== NAVIGATION ====================
  
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
  
  const handlePreviousThread = useCallback(() => {
    if (!selectedThread || currentThreadIndex <= 0) return;
    const prevThread = currentThreads[currentThreadIndex - 1];
    handleThreadClick(prevThread);
  }, [currentThreads, selectedThread, currentThreadIndex, handleThreadClick]);
  
  const handleNextThread = useCallback(() => {
    if (!selectedThread || currentThreadIndex >= currentThreads.length - 1) return;
    const nextThread = currentThreads[currentThreadIndex + 1];
    handleThreadClick(nextThread);
  }, [currentThreads, selectedThread, currentThreadIndex, handleThreadClick]);

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
  
  const getEmailIdsFromCheckedThreads = useCallback(() => {
    const emailIds: string[] = [];
    currentThreads.forEach(thread => {
      if (checkedThreads.has(thread.thread_id)) {
        emailIds.push(...(thread.email_ids || []));
      }
    });
    return emailIds;
  }, [currentThreads, checkedThreads]);
  
  const handleBatchMarkAsRead = useCallback(async () => {
    if (checkedThreads.size === 0) return;
    
    const threadIds = Array.from(checkedThreads);
    const emailIds = getEmailIdsFromCheckedThreads();
    
    setLocalReadThreads(prev => {
      const newSet = new Set(prev);
      threadIds.forEach(id => newSet.add(id));
      return newSet;
    });
    
    setLocalUnreadThreads(prev => {
      const newSet = new Set(prev);
      threadIds.forEach(id => newSet.delete(id));
      return newSet;
    });
    
    setCheckedThreads(new Set());
    
    if (emailIds.length > 0) {
      batchMarkAsRead(emailIds).catch(console.error);
    }
  }, [checkedThreads, getEmailIdsFromCheckedThreads]);
  
  const handleBatchMarkAsUnread = useCallback(async () => {
    if (checkedThreads.size === 0) return;
    
    const threadIds = Array.from(checkedThreads);
    const emailIds = getEmailIdsFromCheckedThreads();
    
    setLocalReadThreads(prev => {
      const newSet = new Set(prev);
      threadIds.forEach(id => newSet.delete(id));
      return newSet;
    });
    
    setLocalUnreadThreads(prev => {
      const newSet = new Set(prev);
      threadIds.forEach(id => newSet.add(id));
      return newSet;
    });
    
    setCheckedThreads(new Set());
    
    if (emailIds.length > 0) {
      batchMarkAsUnread(emailIds).catch(console.error);
    }
  }, [checkedThreads, getEmailIdsFromCheckedThreads]);
  
  const handleBatchMarkAsDone = useCallback(async () => {
    if (checkedThreads.size === 0) return;
    
    const threadIds = Array.from(checkedThreads);
    const emailIds = getEmailIdsFromCheckedThreads();
    
    setLocalDoneThreads(prev => {
      const newSet = new Set(prev);
      threadIds.forEach(id => newSet.add(id));
      return newSet;
    });
    
    setCheckedThreads(new Set());
    
    if (selectedThread && threadIds.includes(selectedThread.thread_id)) {
      setSelectedThread(null);
    }
    
    setToast({
      show: true,
      message: `${threadIds.length} thread${threadIds.length > 1 ? 's' : ''} moved to Done`,
      threadIds,
      emailIds,
      timeoutId: setTimeout(() => {
        if (emailIds.length > 0) {
          batchMarkAsDone(emailIds).catch(console.error);
        }
        setToast(prev => ({ ...prev, show: false }));
      }, 5000)
    });
  }, [checkedThreads, getEmailIdsFromCheckedThreads, selectedThread]);
  
  const handleBatchDelete = useCallback(async () => {
    if (checkedThreads.size === 0) return;
    
    const threadIds = Array.from(checkedThreads);
    const emailIds = getEmailIdsFromCheckedThreads();
    
    setLocalDeletedThreads(prev => {
      const newSet = new Set(prev);
      threadIds.forEach(id => newSet.add(id));
      return newSet;
    });
    
    setCheckedThreads(new Set());
    
    if (selectedThread && threadIds.includes(selectedThread.thread_id)) {
      setSelectedThread(null);
    }
    
    setToast({
      show: true,
      message: `${threadIds.length} thread${threadIds.length > 1 ? 's' : ''} deleted`,
      threadIds,
      emailIds,
      timeoutId: setTimeout(() => {
        if (emailIds.length > 0) {
          batchDelete(emailIds).catch(console.error);
        }
        setToast(prev => ({ ...prev, show: false }));
      }, 5000)
    });
  }, [checkedThreads, getEmailIdsFromCheckedThreads, selectedThread]);

  // ==================== SINGLE THREAD ACTIONS ====================
  
  const handleMarkThreadDone = useCallback(async (thread: Thread) => {
    const emailIds = thread.email_ids || [];
    
    setLocalDoneThreads(prev => new Set(prev).add(thread.thread_id));
    
    if (selectedThread?.thread_id === thread.thread_id) {
      setSelectedThread(null);
    }
    
    setToast({
      show: true,
      message: 'Thread moved to Done',
      threadIds: [thread.thread_id],
      emailIds,
      timeoutId: setTimeout(() => {
        if (emailIds.length > 0) {
          batchMarkAsDone(emailIds).catch(console.error);
        }
        setToast(prev => ({ ...prev, show: false }));
      }, 5000)
    });
  }, [selectedThread]);
  
  const handleDeleteThread = useCallback(async (thread: Thread) => {
    const emailIds = thread.email_ids || [];
    
    setLocalDeletedThreads(prev => new Set(prev).add(thread.thread_id));
    
    if (selectedThread?.thread_id === thread.thread_id) {
      setSelectedThread(null);
    }
    
    setToast({
      show: true,
      message: 'Thread deleted',
      threadIds: [thread.thread_id],
      emailIds,
      timeoutId: setTimeout(() => {
        if (emailIds.length > 0) {
          batchDelete(emailIds).catch(console.error);
        }
        setToast(prev => ({ ...prev, show: false }));
      }, 5000)
    });
  }, [selectedThread]);

  // ==================== TOAST HANDLERS ====================
  
  const handleUndoDelete = useCallback(() => {
    if (toast.timeoutId) {
      clearTimeout(toast.timeoutId);
    }
    
    setLocalDoneThreads(prev => {
      const newSet = new Set(prev);
      toast.threadIds.forEach(id => newSet.delete(id));
      return newSet;
    });
    
    setLocalDeletedThreads(prev => {
      const newSet = new Set(prev);
      toast.threadIds.forEach(id => newSet.delete(id));
      return newSet;
    });
    
    setToast({ show: false, message: '', threadIds: [], emailIds: [], timeoutId: null });
  }, [toast]);
  
  const handleCloseToast = useCallback(() => {
    setToast(prev => ({ ...prev, show: false }));
  }, []);

  // ==================== REPLY/FORWARD HANDLERS ====================
  
  const handleReply = useCallback((email: Email, mode: 'reply' | 'replyAll' = 'reply') => {
    setReplyToEmail(email);
    setReplyMode(mode);
    setIsReplyOpen(true);
  }, []);
  
  const handleForward = useCallback((email: Email) => {
    setForwardEmail(email);
    setIsForwardOpen(true);
  }, []);

  // ==================== EMAIL SENT HANDLERS ====================
  
  const handleEmailSent = useCallback((emailId: string, recipients: string[], emailData: UndoEmailData) => {
    setEmailUndoToast({
      show: true,
      emailId,
      recipients,
      emailData
    });
  }, []);
  
  const handleEmailUndone = useCallback(() => {
    const emailData = emailUndoToast?.emailData;
    if (!emailData) return;
    
    setUndoComposeData(emailData);
    
    if (emailData.type === 'compose') {
      // Will open compose modal via useEffect
    } else if (emailData.type === 'reply' && emailData.originalEmail) {
      setReplyToEmail(emailData.originalEmail as Email);
      setReplyMode(emailData.replyMode || 'reply');
    } else if (emailData.type === 'forward' && emailData.originalEmail) {
      setForwardEmail(emailData.originalEmail as Email);
    }
  }, [emailUndoToast]);
  
  useEffect(() => {
    if (undoComposeData) {
      if (undoComposeData.type === 'compose') {
        setIsComposeOpen(true);
      } else if (undoComposeData.type === 'reply') {
        setIsReplyOpen(true);
      } else if (undoComposeData.type === 'forward') {
        setIsForwardOpen(true);
      }
    }
  }, [undoComposeData]);
  
  const handleCloseEmailUndoToast = useCallback(() => {
    setEmailUndoToast(null);
  }, []);

  // ==================== KEYBOARD SHORTCUTS ====================
  
  useEffect(() => {
    if (isComposeOpen || isReplyOpen || isForwardOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      // Checkbox mode shortcuts
      if (checkedThreads.size > 0) {
        switch (e.key.toLowerCase()) {
          case 'r':
            e.preventDefault();
            handleBatchMarkAsRead();
            break;
          case 'u':
            e.preventDefault();
            handleBatchMarkAsUnread();
            break;
          case 'd':
            e.preventDefault();
            handleBatchMarkAsDone();
            break;
          case 'delete':
          case 'backspace':
            e.preventDefault();
            handleBatchDelete();
            break;
          case 'escape':
            e.preventDefault();
            setCheckedThreads(new Set());
            break;
          case 'a':
            if (e.metaKey || e.ctrlKey) {
              e.preventDefault();
              const allIds = new Set(currentThreads.map(t => t.thread_id));
              setCheckedThreads(allIds);
            }
            break;
        }
        return;
      }
      
      // Thread view mode shortcuts
      if (selectedThread && threadEmails.length > 0) {
        const lastEmail = threadEmails[threadEmails.length - 1];
        
        switch (e.key.toLowerCase()) {
          case 'r':
            e.preventDefault();
            if (lastKeyRef.current === 'r') {
              // R+A = Reply All
              handleReply(lastEmail, 'replyAll');
              lastKeyRef.current = null;
            } else {
              // Start timer for R+A combo
              lastKeyRef.current = 'r';
              setTimeout(() => {
                if (lastKeyRef.current === 'r') {
                  handleReply(lastEmail, 'reply');
                  lastKeyRef.current = null;
                }
              }, 300);
            }
            break;
          case 'a':
            if (lastKeyRef.current === 'r') {
              e.preventDefault();
              handleReply(lastEmail, 'replyAll');
              lastKeyRef.current = null;
            }
            break;
          case 'f':
            e.preventDefault();
            handleForward(lastEmail);
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedThread, checkedThreads.size, threadEmails, isComposeOpen, isReplyOpen, isForwardOpen, handleReply, handleForward, handleBatchMarkAsRead, handleBatchMarkAsUnread, handleBatchMarkAsDone, handleBatchDelete, currentThreads]);

  // ==================== RENDERING ====================

  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-[#1a1a1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!currentUser) return null;

  const hasThreadSelection = selectedThread !== null;
  const hasCheckedThreads = checkedThreads.size > 0;
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  // Format label name for display (capitalize, replace dashes/underscores with spaces)
  const displayLabelName = labelName 
    ? labelName.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Label';

  return (
    <>
      <div className="fixed inset-0 bg-[#1a1a1a]">
        <Sidebar 
          activePage="label"
          activeLabel={labelName}
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
                onClick={() => { setSidebarOpen(false); navigate('/inbox'); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/30 transition-colors w-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5 flex-shrink-0" fill="currentColor">
                  <path d="M155.8 96C123.9 96 96.9 119.4 92.4 150.9L64.6 345.2C64.2 348.2 64 351.2 64 354.3L64 480C64 515.3 92.7 544 128 544L512 544C547.3 544 576 515.3 576 480L576 354.3C576 351.3 575.8 348.2 575.4 345.2L547.6 150.9C543.1 119.4 516.1 96 484.2 96L155.8 96zM155.8 160L484.3 160L511.7 352L451.8 352C439.7 352 428.6 358.8 423.2 369.7L408.9 398.3C403.5 409.1 392.4 416 380.3 416L259.9 416C247.8 416 236.7 409.2 231.3 398.3L217 369.7C211.6 358.9 200.5 352 188.4 352L128.3 352L155.8 160z"/>
                </svg>
                <span className="text-sm font-medium">Inbox</span>
              </button>
              <button 
                onClick={() => { setSidebarOpen(false); navigate('/sent'); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/30 transition-colors w-full"
              >
                <SendHorizontal className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">Sent</span>
              </button>
            </div>
          </div>
        </div>

        {/* ==================== MAIN LAYOUT ==================== */}
        <div className="h-full flex flex-col lg:ml-16">
          {/* ==================== NAVBAR ==================== */}
          <nav className="flex-shrink-0">
            {/* Mobile Header */}
            <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-3 overflow-hidden">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white flex-shrink-0"
                >
                  <Menu className="w-5 h-5" />
                </button>
                {/* Label name as title */}
                <div className="flex items-center gap-2 min-w-0">
                  <Tag className="w-4 h-4 text-[#8FA8A3] flex-shrink-0" />
                  <span className="text-white font-medium truncate">{displayLabelName}</span>
                </div>
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
                {/* Label name as title instead of category tabs */}
                <div className="flex items-center gap-2 pb-4">
                  <Tag className="w-5 h-5 text-[#8FA8A3]" />
                  <h1 className="text-xl font-semibold text-white">{displayLabelName}</h1>
                  <span className="text-sm text-zinc-500">({currentThreads.length})</span>
                </div>
              </div>
              <div className="flex items-center gap-1 pb-4">
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
              <ThreadList
                threads={currentThreads}
                loading={labelLoading}
                error={labelError}
                selectedThreadId={selectedThread?.thread_id || null}
                isCompact={hasThreadSelection && !isExpanded}
                checkedThreadIds={checkedThreads}
                onThreadClick={handleThreadClick}
                onCheckChange={handleCheckChange}
                onMarkDone={handleMarkThreadDone}
                onDelete={handleDeleteThread}
                emptyMessage={`No emails with label "${displayLabelName}"`}
              />
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
                  mode="inbox"
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
                        
                        const extractEmailAddress = (str: string): string => {
                          if (!str) return '';
                          const match = str.match(/<(.+)>/);
                          return match ? match[1] : str;
                        };
                        
                        threadEmails.forEach(email => {
                          if (email.senderEmail) participants.add(email.senderEmail);
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
                mode="inbox"
                onReply={handleReply}
                onForward={handleForward}
                getAuthToken={getAuthToken}
              />
            )}
          </div>
          
        </div>
        
        {/* ==================== KEYBOARD SHORTCUTS BAR ==================== */}
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
                    mode="inbox"
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
                          
                          const extractEmailAddress = (str: string): string => {
                            if (!str) return '';
                            const match = str.match(/<(.+)>/);
                            return match ? match[1] : str;
                          };
                          
                          threadEmails.forEach(email => {
                            if (email.senderEmail) participants.add(email.senderEmail);
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
            setUndoComposeData(null);
          }}
          userEmail={currentUser?.email || ''}
          userTimezone={backendUserData?.timezone}
          onEmailSent={handleEmailSent}
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
              setUndoComposeData(null);
            }}
            mode={replyMode}
            originalEmail={replyToEmail}
            threadId={selectedThread?.thread_id || undoComposeData?.threadId || ''}
            threadSubject={selectedThread?.gmail_subject || ''}
            messageId={replyToEmail?.message_id || undoComposeData?.messageId}
            userEmail={currentUser?.email || ''}
            userTimezone={backendUserData?.timezone}
            onEmailSent={handleEmailSent}
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
              setUndoComposeData(null);
            }}
            originalEmail={forwardEmail}
            threadId={selectedThread?.thread_id || undoComposeData?.threadId || ''}
            threadSubject={selectedThread?.gmail_subject || ''}
            userEmail={currentUser?.email || ''}
            userTimezone={backendUserData?.timezone}
            onEmailSent={handleEmailSent}
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
        
        {/* Search Modal */}
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          userEmail={currentUser?.email || ''}
        />
        
      </div>
    </>
  );
};

export default LabelPage;