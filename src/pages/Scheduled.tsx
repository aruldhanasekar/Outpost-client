// pages/Scheduled.tsx - Scheduled Emails Page
// Shows scheduled emails waiting to be sent with Cancel, Edit, Reschedule actions
// v2.0: Full implementation with real-time updates

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  Loader2, 
  Menu, 
  X, 
  Clock, 
  Calendar,
  Mail,
  MoreVertical,
  Trash2,
  Edit3,
  CalendarClock,
  Send,
  Paperclip,
  Reply,
  Forward,
  AlertCircle
} from "lucide-react";
import {
  ComposeModal
} from "@/components/inbox";
import { SendLaterModal } from "@/components/inbox/SendLaterModal";
import { Sidebar } from "@/components/layout";
import { useScheduledEmails, formatScheduledTime, getTimeUntilSend, ScheduledEmail } from "@/hooks/useScheduledEmails";

const ScheduledPage = () => {
  const { currentUser, userProfile, loading: authLoading, backendUserData } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Compose modal state for editing
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState<ScheduledEmail | null>(null);

  // Reschedule modal state
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [reschedulingEmail, setReschedulingEmail] = useState<ScheduledEmail | null>(null);

  // Dropdown menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Action loading states
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);

  // Fetch scheduled emails with real-time updates
  const { emails, loading: emailsLoading, error: emailsError, refresh } = useScheduledEmails(currentUser?.uid);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate("/");
    }
  }, [currentUser, authLoading, navigate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Get auth token
  const getIdToken = useCallback(async () => {
    if (!currentUser) throw new Error("Not authenticated");
    return currentUser.getIdToken();
  }, [currentUser]);

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
        const data = await response.json();
        throw new Error(data.detail || 'Failed to cancel email');
      }

      console.log('✅ Email cancelled:', email.id);
      // Real-time listener will update the list automatically
      
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
    setEditingEmail(email);
    setIsComposeOpen(true);
    setOpenMenuId(null);
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
        const data = await response.json();
        throw new Error(data.detail || 'Failed to reschedule email');
      }

      console.log('✅ Email rescheduled:', reschedulingEmail.id);
      setIsRescheduleOpen(false);
      setReschedulingEmail(null);
      // Real-time listener will update the list automatically
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reschedule email';
      console.error('❌ Reschedule error:', error);
      alert(`Failed to reschedule: ${errorMessage}`);
    } finally {
      setReschedulingId(null);
    }
  };

  // Handle edit modal close
  const handleEditClose = () => {
    setIsComposeOpen(false);
    setEditingEmail(null);
  };

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
    if (to.length === 2) return `${to[0]}, ${to[1]}`;
    return `${to[0]} +${to.length - 1} more`;
  };

  // Get body preview (strip HTML)
  const getBodyPreview = (html: string, maxLength: number = 100) => {
    if (!html) return '';
    const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // ==================== LOADING STATE ====================

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

        {/* Sidebar */}
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
            <span className="text-white font-medium">Outpost</span>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <nav className="p-4 space-y-1">
            <button 
              onClick={() => { navigate('/inbox'); setSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <Mail className="w-5 h-5" />
              <span>Inbox</span>
            </button>

            <button 
              onClick={() => { navigate('/sent'); setSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <Send className="w-5 h-5" />
              <span>Sent</span>
            </button>

            <button 
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-zinc-800 text-white transition-colors"
            >
              <Clock className="w-5 h-5" />
              <span>Scheduled</span>
            </button>
          </nav>
        </div>

        {/* ==================== MAIN CONTENT ==================== */}
        <div className="lg:ml-16 h-full flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-zinc-800">
            {/* Mobile menu button */}
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-zinc-800 rounded-lg text-zinc-400"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Title */}
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#f7ac5c]" />
              <h1 className="text-lg font-semibold text-white">Scheduled</h1>
              {emails.length > 0 && (
                <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-sm rounded-full">
                  {emails.length}
                </span>
              )}
            </div>

            {/* Spacer */}
            <div className="w-10 lg:hidden" />
          </div>

          {/* ==================== EMAIL LIST ==================== */}
          <div className="flex-1 overflow-y-auto">
            
            {/* Loading State */}
            {emailsLoading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
              </div>
            )}

            {/* Error State */}
            {emailsError && (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                <p className="text-zinc-400 text-center">{emailsError}</p>
                <button 
                  onClick={refresh}
                  className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty State */}
            {!emailsLoading && !emailsError && emails.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-white font-medium mb-2">No scheduled emails</h3>
                <p className="text-zinc-500 text-center text-sm max-w-sm">
                  When you schedule an email to send later, it will appear here. 
                  You can edit, reschedule, or cancel it anytime before it's sent.
                </p>
              </div>
            )}

            {/* Email List */}
            {!emailsLoading && !emailsError && emails.length > 0 && (
              <div className="divide-y divide-zinc-800">
                {emails.map((email) => (
                  <div 
                    key={email.id}
                    className="group px-4 lg:px-6 py-4 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      
                      {/* Email Icon */}
                      <div className="flex-shrink-0 w-10 h-10 bg-[#f7ac5c]/10 rounded-full flex items-center justify-center">
                        <Clock className="w-5 h-5 text-[#f7ac5c]" />
                      </div>

                      {/* Email Content */}
                      <div className="flex-1 min-w-0">
                        
                        {/* Top Row: Recipients + Time */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-white font-medium truncate">
                              {formatRecipients(email.to)}
                            </span>
                            {getTypeBadge(email)}
                          </div>
                          <span className="text-xs text-[#f7ac5c] font-medium whitespace-nowrap">
                            {getTimeUntilSend(email.scheduled_at)}
                          </span>
                        </div>

                        {/* Subject */}
                        <p className="text-zinc-300 text-sm truncate mb-1">
                          {email.subject || '(No Subject)'}
                        </p>

                        {/* Body Preview */}
                        <p className="text-zinc-500 text-sm truncate">
                          {getBodyPreview(email.body_html)}
                        </p>

                        {/* Bottom Row: Scheduled time + Attachments */}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-zinc-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatScheduledTime(email.scheduled_at)}
                          </span>
                          {email.attachments && email.attachments.length > 0 && (
                            <span className="text-xs text-zinc-500 flex items-center gap-1">
                              <Paperclip className="w-3 h-3" />
                              {email.attachments.length}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions Menu */}
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === email.id ? null : email.id);
                          }}
                          className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        {/* Dropdown Menu */}
                        {openMenuId === email.id && (
                          <div 
                            className="absolute right-0 top-10 w-48 bg-[#2d2d2d] border border-zinc-700 rounded-lg shadow-xl z-50 py-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleEdit(email)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleReschedule(email)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                            >
                              <CalendarClock className="w-4 h-4" />
                              Reschedule
                            </button>
                            <div className="h-px bg-zinc-700 my-1" />
                            <button
                              onClick={() => handleCancel(email)}
                              disabled={cancellingId === email.id}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                            >
                              {cancellingId === email.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ==================== MODALS ==================== */}

        {/* Compose Modal for Editing */}
        {/* TODO: Update ComposeModal to support edit mode props */}
        <ComposeModal
          isOpen={isComposeOpen}
          onClose={handleEditClose}
          userEmail={currentUser?.email || ''}
          userTimezone={backendUserData?.timezone}
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

      </div>
    </>
  );
};

export default ScheduledPage;