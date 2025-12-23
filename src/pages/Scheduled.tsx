// pages/Scheduled.tsx - Scheduled Emails Page
// Shows scheduled emails with detail view, edit, reschedule, cancel functionality
// Layout matches Sent.tsx with list + detail + sidebar

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2, Menu, X, MoreVertical, Clock, Calendar, Paperclip, Reply, Forward } from "lucide-react";
import { Sidebar } from "@/components/layout";
import { ComposeModal } from "@/components/inbox";
import { SendLaterModal } from "@/components/inbox/SendLaterModal";
import { useScheduledEmails, formatScheduledTime, getTimeUntilSend, ScheduledEmail } from "@/hooks/useScheduledEmails";
import { EmailSendUndoToast } from "@/components/ui/EmailSendUndoToast";
import { UndoEmailData } from "@/components/inbox/ComposeModal";

const ScheduledPage = () => {
  const { currentUser, userProfile, loading: authLoading, backendUserData } = useAuth();
  const navigate = useNavigate();
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // Compose modal state (for editing)
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState<ScheduledEmail | null>(null);
  
  // Reschedule modal state
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [reschedulingEmail, setReschedulingEmail] = useState<ScheduledEmail | null>(null);
  
  // Action loading states
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);

  // Email send undo toast state
  const [emailUndoToast, setEmailUndoToast] = useState<{
    show: boolean;
    emailId: string;
    recipients: string[];
    emailData: UndoEmailData;
  } | null>(null);

  // Undo restore state
  const [undoComposeData, setUndoComposeData] = useState<UndoEmailData | null>(null);

  // Fetch scheduled emails
  const { emails, loading: emailsLoading, error: emailsError, refresh } = useScheduledEmails(currentUser?.uid);

  // Derive selectedEmail from emails array (always fresh)
  const selectedEmail = selectedEmailId ? emails.find(e => e.id === selectedEmailId) || null : null;

  // Get ID token helper
  const getIdToken = useCallback(async () => {
    if (!currentUser) throw new Error("Not authenticated");
    return currentUser.getIdToken();
  }, [currentUser]);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate("/");
    }
  }, [currentUser, authLoading, navigate]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  // ==================== ACTIONS ====================

  // Cancel scheduled email
  const handleCancel = async (email: ScheduledEmail) => {
    if (!confirm(`Cancel scheduled email "${email.subject}"?`)) return;
    
    setCancellingId(email.id);
    setOpenMenuId(null);

    try {
      const token = await getIdToken();
      const response = await fetch(`/api/scheduled/${email.id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMessage = `Failed to cancel email (${response.status})`;
        if (text) {
          try {
            const data = JSON.parse(text);
            errorMessage = data.detail || errorMessage;
          } catch {
            errorMessage = text || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }

      console.log('✅ Email cancelled:', email.id);
      if (selectedEmailId === email.id) {
        setSelectedEmailId(null);
      }
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel email';
      console.error('❌ Cancel error:', error);
      alert(`Failed to cancel: ${errorMessage}`);
    } finally {
      setCancellingId(null);
    }
  };

  // Open edit modal
  const handleEdit = (email: ScheduledEmail) => {
    console.log('📝 Edit clicked for:', email.id, email.subject);
    setEditingEmail(email);
    setOpenMenuId(null);
  };

  // Open compose modal when editingEmail is set
  useEffect(() => {
    if (editingEmail && !isComposeOpen) {
      console.log('📝 Opening edit modal for:', editingEmail.subject);
      setIsComposeOpen(true);
    }
  }, [editingEmail, isComposeOpen]);

  // Handle edit modal close
  const handleEditClose = () => {
    setIsComposeOpen(false);
    setEditingEmail(null);
  };

  // Open reschedule modal
  const handleReschedule = (email: ScheduledEmail) => {
    setReschedulingEmail(email);
    setIsRescheduleOpen(true);
    setOpenMenuId(null);
  };

  // Save reschedule
  const handleRescheduleSave = async (newDate: Date) => {
    if (!reschedulingEmail) return;

    setReschedulingId(reschedulingEmail.id);

    try {
      const token = await getIdToken();
      const response = await fetch(`/api/scheduled/${reschedulingEmail.id}/reschedule`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scheduled_at: newDate.toISOString()
        })
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMessage = `Failed to reschedule email (${response.status})`;
        if (text) {
          try {
            const data = JSON.parse(text);
            errorMessage = data.detail || errorMessage;
          } catch {
            errorMessage = text || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }

      console.log('✅ Email rescheduled:', reschedulingEmail.id);
      setIsRescheduleOpen(false);
      setReschedulingEmail(null);
      refresh(); // Trigger refresh to ensure real-time sync
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reschedule email';
      console.error('❌ Reschedule error:', error);
      alert(`Failed to reschedule: ${errorMessage}`);
    } finally {
      setReschedulingId(null);
    }
  };

  // Handle email click
  const handleEmailClick = (email: ScheduledEmail) => {
    setSelectedEmailId(email.id);
  };

  // Close detail panel
  const handleCloseDetail = () => {
    setSelectedEmailId(null);
  };

  // Handle new compose (not editing)
  const handleNewCompose = () => {
    setEditingEmail(null);
    setIsComposeOpen(true);
  };

  // Handle email sent - show undo toast
  const handleEmailSent = useCallback((emailId: string, recipients: string[], emailData: UndoEmailData) => {
    console.log('📧 Email queued, showing undo toast:', emailId);
    setEmailUndoToast({
      show: true,
      emailId,
      recipients,
      emailData
    });
  }, []);

  // Handle email undone - just store data, useEffect will open modal
  const handleEmailUndone = useCallback(() => {
    console.log('↩️ Email cancelled, storing data for modal');
    const emailData = emailUndoToast?.emailData;
    if (!emailData) return;
    
    // Store undo data - useEffect below will open the modal
    setUndoComposeData(emailData);
  }, [emailUndoToast]);

  // Open modal AFTER undoComposeData is set (fixes timing issue)
  useEffect(() => {
    if (undoComposeData && undoComposeData.type === 'compose') {
      console.log('📧 Opening compose modal with undo data');
      setIsComposeOpen(true);
    }
  }, [undoComposeData]);

  // Handle close undo toast
  const handleCloseEmailUndoToast = useCallback(() => {
    setEmailUndoToast(null);
  }, []);

  // ==================== RENDER HELPERS ====================

  // Get email type badge
  const getTypeBadge = (email: ScheduledEmail) => {
    if (email.type === 'reply') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
          <Reply className="w-3 h-3" />
          Reply
        </span>
      );
    }
    if (email.type === 'forward') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
          <Forward className="w-3 h-3" />
          Forward
        </span>
      );
    }
    return null;
  };

  // Format recipients for display
  const formatRecipients = (to: string[]) => {
    if (!to || to.length === 0) return 'No recipients';
    if (to.length === 1) return to[0];
    return `${to[0]} +${to.length - 1} more`;
  };

  // Strip HTML for preview
  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // ==================== LOADING / AUTH STATES ====================

  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-[#1a1a1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!currentUser) return null;

  // ==================== MAIN RENDER ====================

  return (
    <>
      <div className="fixed inset-0 bg-[#1a1a1a]">
        
        {/* Desktop Sidebar */}
        <Sidebar 
          activePage="scheduled"
          userEmail={currentUser?.email || ""}
          userName={userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ""}`.trim() : undefined}
          avatarLetter={userProfile?.firstName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || "U"}
        />

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Mobile Sidebar Drawer */}
        <div className={`
          lg:hidden fixed top-0 left-0 h-full w-64 bg-[#1a1a1a] z-50 transform transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#8FA8A3] flex items-center justify-center text-base font-semibold text-black">
                {currentUser?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex flex-col">
                <span className="text-white text-sm font-medium truncate max-w-[140px]">
                  {currentUser?.email || "User"}
                </span>
                <span className="text-zinc-500 text-xs">Outpost</span>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-1">
            <button 
              onClick={() => { navigate('/inbox'); setSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                <path d="M155.8 96C123.9 96 96.9 119.4 92.4 150.9L64.6 345.2C64.2 348.2 64 351.2 64 354.3L64 480C64 515.3 92.7 544 128 544L512 544C547.3 544 576 515.3 576 480L576 354.3C576 351.3 575.8 348.2 575.4 345.2L547.6 150.9C543.1 119.4 516.1 96 484.2 96L155.8 96zM155.8 160L484.3 160L511.7 352L451.8 352C439.7 352 428.6 358.8 423.2 369.7L408.9 398.3C403.5 409.1 392.4 416 380.3 416L259.9 416C247.8 416 236.7 409.2 231.3 398.3L217 369.7C211.6 358.9 200.5 352 188.4 352L128.3 352L155.8 160z"/>
              </svg>
              <span>Inbox</span>
            </button>

            <button 
              onClick={() => { navigate('/sent'); setSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
              <span>Sent</span>
            </button>

            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white bg-zinc-800">
              <Clock className="w-5 h-5" />
              <span>Scheduled</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:ml-16 h-full flex flex-col pb-12">
          
          {/* Header */}
          <nav className="flex-shrink-0">
            {/* Mobile Header */}
            <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <span className="text-white font-medium text-sm">Scheduled</span>
                <span className="text-zinc-500 text-sm">{emails.length}</span>
              </div>

              {/* RIGHT: Action Icons */}
              <div className="flex items-center">
                {/* Search Icon */}
                <button className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                    <path d="M480 272C480 317.9 465.1 360.3 440 394.7L566.6 521.4C579.1 533.9 579.1 554.2 566.6 566.7C554.1 579.2 533.8 579.2 521.3 566.7L394.7 440C360.3 465.1 317.9 480 272 480C157.1 480 64 386.9 64 272C64 157.1 157.1 64 272 64C386.9 64 480 157.1 480 272zM272 416C351.5 416 416 351.5 416 272C416 192.5 351.5 128 272 128C192.5 128 128 192.5 128 272C128 351.5 192.5 416 272 416z"/>
                  </svg>
                </button>

                {/* Compose/Pencil Icon */}
                <button 
                  onClick={handleNewCompose}
                  className="p-2 bg-[#8FA8A3] hover:bg-[#7a9691] rounded-lg transition-colors text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                    <path d="M505 122.9L517.1 135C526.5 144.4 526.5 159.6 517.1 168.9L488 198.1L441.9 152L471 122.9C480.4 113.5 495.6 113.5 504.9 122.9zM273.8 320.2L408 185.9L454.1 232L319.8 366.2C316.9 369.1 313.3 371.2 309.4 372.3L250.9 389L267.6 330.5C268.7 326.6 270.8 323 273.7 320.1zM437.1 89L239.8 286.2C231.1 294.9 224.8 305.6 221.5 317.3L192.9 417.3C190.5 425.7 192.8 434.7 199 440.9C205.2 447.1 214.2 449.4 222.6 447L322.6 418.4C334.4 415 345.1 408.7 353.7 400.1L551 202.9C579.1 174.8 579.1 129.2 551 101.1L538.9 89C510.8 60.9 465.2 60.9 437.1 89zM152 128C103.4 128 64 167.4 64 216L64 488C64 536.6 103.4 576 152 576L424 576C472.6 576 512 536.6 512 488L512 376C512 362.7 501.3 352 488 352C474.7 352 464 362.7 464 376L464 488C464 510.1 446.1 528 424 528L152 528C129.9 528 112 510.1 112 488L112 216C112 193.9 129.9 176 152 176L264 176C277.3 176 288 165.3 288 152C288 138.7 277.3 128 264 128L152 128z"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Desktop Header */}
            <div className="hidden lg:flex items-center justify-between px-6 pt-4">
              <div className="flex items-center gap-4 pb-4">
                <span className="text-[#8FA8A3] font-medium text-sm">Scheduled</span>
                <span className="text-zinc-500 text-sm">{emails.length} emails</span>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-1 pb-4">
                {/* Search Icon */}
                <button className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                    <path d="M480 272C480 317.9 465.1 360.3 440 394.7L566.6 521.4C579.1 533.9 579.1 554.2 566.6 566.7C554.1 579.2 533.8 579.2 521.3 566.7L394.7 440C360.3 465.1 317.9 480 272 480C157.1 480 64 386.9 64 272C64 157.1 157.1 64 272 64C386.9 64 480 157.1 480 272zM272 416C351.5 416 416 351.5 416 272C416 192.5 351.5 128 272 128C192.5 128 128 192.5 128 272C128 351.5 192.5 416 272 416z"/>
                  </svg>
                </button>

                {/* Compose Icon */}
                <button 
                  onClick={handleNewCompose}
                  className="p-2 bg-[#8FA8A3] hover:bg-[#7a9691] rounded-lg transition-colors text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                    <path d="M505 122.9L517.1 135C526.5 144.4 526.5 159.6 517.1 168.9L488 198.1L441.9 152L471 122.9C480.4 113.5 495.6 113.5 504.9 122.9zM273.8 320.2L408 185.9L454.1 232L319.8 366.2C316.9 369.1 313.3 371.2 309.4 372.3L250.9 389L267.6 330.5C268.7 326.6 270.8 323 273.7 320.1zM437.1 89L239.8 286.2C231.1 294.9 224.8 305.6 221.5 317.3L192.9 417.3C190.5 425.7 192.8 434.7 199 440.9C205.2 447.1 214.2 449.4 222.6 447L322.6 418.4C334.4 415 345.1 408.7 353.7 400.1L551 202.9C579.1 174.8 579.1 129.2 551 101.1L538.9 89C510.8 60.9 465.2 60.9 437.1 89zM152 128C103.4 128 64 167.4 64 216L64 488C64 536.6 103.4 576 152 576L424 576C472.6 576 512 536.6 512 488L512 376C512 362.7 501.3 352 488 352C474.7 352 464 362.7 464 376L464 488C464 510.1 446.1 528 424 528L152 528C129.9 528 112 510.1 112 488L112 216C112 193.9 129.9 176 152 176L264 176C277.3 176 288 165.3 288 152C288 138.7 277.3 128 264 128L152 128z"/>
                  </svg>
                </button>
              </div>
            </div>
          </nav>

          {/* Main Content - List + Detail */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Email List Panel */}
            <div 
              className={`
                overflow-y-auto hide-scrollbar transition-[width] duration-300 ease-out
                ${selectedEmail ? 'hidden lg:block lg:w-[35%] lg:border-r lg:border-zinc-700/50' : 'w-full'}
              `}
            >
              {/* Loading State */}
              {emailsLoading && (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
                </div>
              )}

              {/* Error State */}
              {emailsError && (
                <div className="flex flex-col items-center justify-center h-48 px-4">
                  <p className="text-red-400 text-sm text-center mb-2">{emailsError}</p>
                  <button 
                    onClick={refresh}
                    className="text-sm text-[#8FA8A3] hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Empty State */}
              {!emailsLoading && !emailsError && emails.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 px-4">
                  <Clock className="w-12 h-12 text-zinc-600 mb-3" />
                  <p className="text-zinc-500 text-sm text-center">No scheduled emails</p>
                  <p className="text-zinc-600 text-xs text-center mt-1">
                    Schedule emails to send later from the compose window
                  </p>
                </div>
              )}

              {/* Email List */}
              {!emailsLoading && !emailsError && emails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => handleEmailClick(email)}
                  className={`
                    group relative px-4 lg:px-6 py-4 border-b border-zinc-800/50 cursor-pointer
                    transition-all duration-150
                    ${selectedEmail?.id === email.id 
                      ? 'bg-zinc-700/40' 
                      : 'hover:bg-zinc-800/50'
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left Content */}
                    <div className="flex-1 min-w-0">
                      {/* Recipients + Type Badge */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white text-sm font-medium truncate">
                          {formatRecipients(email.to)}
                        </span>
                        {getTypeBadge(email)}
                      </div>

                      {/* Subject */}
                      <p className="text-zinc-300 text-sm truncate mb-1">
                        {email.subject || '(No subject)'}
                      </p>

                      {/* Preview */}
                      <p className="text-zinc-500 text-sm truncate">
                        {stripHtml(email.body_html || '')}
                      </p>

                      {/* Scheduled Time + Attachments */}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1.5 text-zinc-500">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-xs">{formatScheduledTime(email.scheduled_at)}</span>
                        </div>
                        {email.attachments && email.attachments.length > 0 && (
                          <div className="flex items-center gap-1 text-zinc-500">
                            <Paperclip className="w-3.5 h-3.5" />
                            <span className="text-xs">{email.attachments.length}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Side - Time Until + Menu */}
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs text-[#8FA8A3]">
                        {getTimeUntilSend(email.scheduled_at)}
                      </span>

                      {/* Action Menu */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === email.id ? null : email.id);
                          }}
                          className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {openMenuId === email.id && (
                          <div 
                            className="absolute right-0 top-8 z-50 w-36 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleEdit(email)}
                              className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleReschedule(email)}
                              disabled={reschedulingId === email.id}
                              className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors disabled:opacity-50"
                            >
                              {reschedulingId === email.id ? 'Rescheduling...' : 'Reschedule'}
                            </button>
                            <button
                              onClick={() => handleCancel(email)}
                              disabled={cancellingId === email.id}
                              className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-700 hover:text-red-300 transition-colors disabled:opacity-50"
                            >
                              {cancellingId === email.id ? 'Cancelling...' : 'Cancel'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Detail Panel - Desktop */}
            <div 
              className={`
                hidden lg:flex flex-col bg-[#252525] overflow-hidden
                transition-[width,opacity] duration-300 ease-out
                ${selectedEmail ? 'w-[50%] opacity-100' : 'w-0 opacity-0'}
              `}
            >
              {selectedEmail && (
                <ScheduledEmailDetail
                  email={selectedEmail}
                  onClose={handleCloseDetail}
                  onEdit={() => handleEdit(selectedEmail)}
                  onReschedule={() => handleReschedule(selectedEmail)}
                  onCancel={() => handleCancel(selectedEmail)}
                />
              )}
            </div>

            {/* Profile Panel - Desktop */}
            <div 
              className={`
                hidden lg:flex flex-col bg-[#1a1a1a] border-l border-zinc-700/50 overflow-hidden
                transition-[width,opacity] duration-300 ease-out
                ${selectedEmail ? 'w-[15%] opacity-100' : 'w-0 opacity-0'}
              `}
            >
              {selectedEmail && (
                <ScheduledEmailSidebar
                  email={selectedEmail}
                  userEmail={currentUser?.email || ''}
                />
              )}
            </div>

            {/* Mobile Detail View - Full Screen */}
            {selectedEmail && (
              <div className="lg:hidden fixed inset-0 bg-[#252525] z-30">
                <ScheduledEmailDetail
                  email={selectedEmail}
                  onClose={handleCloseDetail}
                  onEdit={() => handleEdit(selectedEmail)}
                  onReschedule={() => handleReschedule(selectedEmail)}
                  onCancel={() => handleCancel(selectedEmail)}
                  isMobile
                />
              </div>
            )}
          </div>
        </div>

        {/* ==================== MODALS ==================== */}

        {/* Compose Modal for Editing */}
        <ComposeModal
          key={editingEmail?.id || 'new'}
          isOpen={isComposeOpen}
          onClose={() => {
            handleEditClose();
            setUndoComposeData(null);
          }}
          userEmail={currentUser?.email || ''}
          userTimezone={backendUserData?.timezone}
          editMode={!!editingEmail}
          editEmailId={editingEmail?.id}
          initialTo={editingEmail?.to || (undoComposeData?.type === 'compose' ? undoComposeData.to : undefined)}
          initialCc={editingEmail?.cc || (undoComposeData?.type === 'compose' ? undoComposeData.cc : undefined)}
          initialBcc={editingEmail?.bcc || (undoComposeData?.type === 'compose' ? undoComposeData.bcc : undefined)}
          initialSubject={editingEmail?.subject || (undoComposeData?.type === 'compose' ? undoComposeData.subject : undefined)}
          initialBody={editingEmail?.body_html || (undoComposeData?.type === 'compose' ? undoComposeData.body_html : undefined)}
          initialAttachments={undoComposeData?.type === 'compose' ? undoComposeData.attachments : undefined}
          initialScheduledAt={editingEmail?.scheduled_at}
          onEmailUpdated={() => {
            console.log('✅ Scheduled email updated');
            handleEditClose();
            refresh(); // Trigger refresh to ensure real-time sync
          }}
          onEmailSent={handleEmailSent}
        />

        {/* Reschedule Modal */}
        <SendLaterModal
          isOpen={isRescheduleOpen}
          onClose={() => {
            setIsRescheduleOpen(false);
            setReschedulingEmail(null);
          }}
          onSchedule={handleRescheduleSave}
          userTimezone={backendUserData?.timezone || 'UTC'}
        />

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

// ==================== SCHEDULED EMAIL DETAIL COMPONENT ====================

interface ScheduledEmailDetailProps {
  email: ScheduledEmail;
  onClose: () => void;
  onEdit: () => void;
  onReschedule: () => void;
  onCancel: () => void;
  isMobile?: boolean;
}

function ScheduledEmailDetail({ email, onClose, onEdit, onReschedule, onCancel, isMobile = false }: ScheduledEmailDetailProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700/50">
        <h2 className="text-lg font-medium text-white truncate pr-4" style={{ fontFamily: "'Manrope', sans-serif" }}>
          {email.subject || '(No subject)'}
        </h2>
        <div className="flex items-center gap-1">
          <button 
            onClick={onEdit}
            className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
            title="Edit"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button 
            onClick={onReschedule}
            className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
            title="Reschedule"
          >
            <Calendar className="w-5 h-5" />
          </button>
          <button 
            onClick={onCancel}
            className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-red-400"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-6 pb-6">
        <div className="max-w-[600px] mx-auto pt-4">
          {/* Email Content Card */}
          <div className="rounded-lg bg-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <span className="text-sm font-medium text-gray-700">
                  To: {email.to?.join(', ')}
                </span>
                {email.cc && email.cc.length > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">Cc: {email.cc.join(', ')}</p>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatScheduledTime(email.scheduled_at)}</span>
              </div>
            </div>
            
            {/* Body */}
            <div className="p-6">
              <div 
                className="text-zinc-800 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: email.body_html || '' }}
              />
            </div>

            {/* Attachments */}
            {email.attachments && email.attachments.length > 0 && (
              <div className="px-6 pb-4 border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500 mb-2">Attachments ({email.attachments.length})</p>
                <div className="flex flex-wrap gap-2">
                  {email.attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                      <Paperclip className="w-3 h-3" />
                      <span>{att.filename}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== SCHEDULED EMAIL SIDEBAR ====================

interface ScheduledEmailSidebarProps {
  email: ScheduledEmail;
  userEmail: string;
}

function ScheduledEmailSidebar({ email, userEmail }: ScheduledEmailSidebarProps) {
  return (
    <div className="p-6 pt-8">
      {/* From */}
      <div className="mb-4">
        <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">From</p>
        <p className="text-zinc-300 text-sm break-all">{userEmail}</p>
      </div>
      
      {/* To */}
      <div className="mb-4">
        <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">To</p>
        {email.to?.map((recipient, idx) => (
          <p key={idx} className="text-zinc-300 text-sm break-all">{recipient}</p>
        ))}
      </div>

      {/* Scheduled For */}
      <div className="mb-4">
        <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Scheduled For</p>
        <p className="text-zinc-300 text-sm">{formatScheduledTime(email.scheduled_at)}</p>
        <p className="text-[#8FA8A3] text-xs mt-0.5">{getTimeUntilSend(email.scheduled_at)}</p>
      </div>

      {/* Type */}
      {email.type && (
        <div className="mb-4">
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Type</p>
          <p className="text-zinc-300 text-sm capitalize">{email.type}</p>
        </div>
      )}
    </div>
  );
}

export default ScheduledPage;