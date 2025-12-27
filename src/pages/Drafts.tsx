// pages/Draft.tsx - Draft Emails Page
// v4.0: Supports compose, reply, and forward drafts with undo toast

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2, Menu } from "lucide-react";
import {
  Email,
  EmailList,
  ComposeModal,
  ReplyModal,
  ForwardModal,
} from "@/components/inbox";
import { SearchModal } from "@/components/search";
import { useDraftEmails } from "@/hooks/useDraftEmails";
import { loadDraft, DraftData, OriginalEmailSnapshot } from "@/services/draftApi";
import { Sidebar } from "@/components/layout";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { EmailSendUndoToast } from "@/components/ui/EmailSendUndoToast";
import { UndoEmailData } from "@/components/inbox/ComposeModal";

// Draft data for compose editing
interface ComposeDraftData {
  id: string;
  draft_type: 'compose';
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body_html: string;
  attachments: Array<{ id: string; name: string; size: number; type: string }>;
}

// Draft data for reply editing
interface ReplyDraftData {
  id: string;
  draft_type: 'reply';
  reply_mode: 'reply' | 'replyAll';
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body_html: string;
  thread_id: string;
  message_id?: string;
  original_email: Email;
  attachments: Array<{ id: string; name: string; size: number; type: string }>;
}

// Draft data for forward editing
interface ForwardDraftData {
  id: string;
  draft_type: 'forward';
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body_html: string;
  thread_id: string;
  original_email: Email;
  attachments: Array<{ id: string; name: string; size: number; type: string }>;
}

type EditingDraft = ComposeDraftData | ReplyDraftData | ForwardDraftData | null;

// Helper: Convert OriginalEmailSnapshot to Email type
function snapshotToEmail(snapshot: OriginalEmailSnapshot, draftId: string): Email {
  return {
    id: draftId,
    sender: snapshot.sender,
    senderEmail: snapshot.senderEmail,
    subject: snapshot.subject,
    preview: '',
    body: snapshot.body,
    time: snapshot.time,
    date: snapshot.date,
    isRead: true,
    hasAttachment: false,
    thread_id: '',
    to: snapshot.to,
    message_id: snapshot.message_id,
  };
}

// Helper: Extract email only from "Name <email>" format
function extractEmailOnly(emailStr: string): string {
  const match = emailStr.match(/<([^>]+)>/);
  return match ? match[1] : emailStr;
}

// Helper: Strip quoted reply/forward text from body for display
function stripQuotedText(html: string): string {
  const patterns = [
    /On\s+[A-Za-z]{3},\s+[A-Za-z]{3}\s+\d{1,2},\s+\d{4}\s+at\s+[\d:]+\s*[APap][Mm]\s+[^<]*<[^>]+>\s*wrote:[\s\S]*/gi,
    /On\s+\d{1,2}\/\d{1,2}\/\d{2,4}[\s\S]*wrote:[\s\S]*/gi,
    /<blockquote[^>]*>[\s\S]*<\/blockquote>/gi,
    /---------- Forwarded message ---------[\s\S]*/gi,
  ];
  
  let result = html;
  for (const pattern of patterns) {
    result = result.replace(pattern, '');
  }
  return result.trim();
}

const DraftPage = () => {
  const { currentUser, userProfile, loading: authLoading, backendUserData } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal states
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [isForwardOpen, setIsForwardOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Current editing draft
  const [editingDraft, setEditingDraft] = useState<EditingDraft>(null);

  // Checked emails state (for bulk selection)
  const [checkedEmails, setCheckedEmails] = useState<Set<string>>(new Set());

  // Email send undo toast state
  const [emailUndoToast, setEmailUndoToast] = useState<{
    show: boolean;
    emailId: string;
    recipients: string[];
    emailData: UndoEmailData;
  } | null>(null);

  // Undo restore state
  const [undoComposeData, setUndoComposeData] = useState<UndoEmailData | null>(null);

  // Fetch draft emails from Firestore
  const { emails, loading: emailsLoading, error: emailsError } = useDraftEmails(currentUser?.uid);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate("/");
    }
  }, [currentUser, authLoading, navigate]);

  // Keyboard shortcut: "/" to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (target.closest('[data-modal]')) return;
      if (isComposeOpen || isReplyOpen || isForwardOpen || isSearchOpen) return;
      
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isComposeOpen, isReplyOpen, isForwardOpen, isSearchOpen]);

  // Handle email click - load full draft and open correct modal
  const handleEmailClick = useCallback(async (email: Email) => {
    try {
      const draft = await loadDraft(email.id);
      if (!draft) {
        console.error('Draft not found:', email.id);
        return;
      }

      // Clean email addresses
      const cleanTo = (draft.to || []).map(extractEmailOnly);
      const cleanCc = (draft.cc || []).map(extractEmailOnly);
      const cleanBcc = (draft.bcc || []).map(extractEmailOnly);
      
      // Strip quoted text from body for display
      const cleanBody = stripQuotedText(draft.body_html || '');

      switch (draft.draft_type) {
        case 'reply':
          if (draft.original_email) {
            setEditingDraft({
              id: email.id,
              draft_type: 'reply',
              reply_mode: draft.reply_mode || 'reply',
              to: cleanTo,
              cc: cleanCc,
              bcc: cleanBcc,
              subject: draft.subject || '',
              body_html: cleanBody,
              thread_id: draft.thread_id || '',
              message_id: draft.message_id,
              original_email: snapshotToEmail(draft.original_email, email.id),
              attachments: draft.attachments || [],
            });
            setIsReplyOpen(true);
          }
          break;
          
        case 'forward':
          if (draft.original_email) {
            setEditingDraft({
              id: email.id,
              draft_type: 'forward',
              to: cleanTo,
              cc: cleanCc,
              bcc: cleanBcc,
              subject: draft.subject || '',
              body_html: cleanBody,
              thread_id: draft.thread_id || '',
              original_email: snapshotToEmail(draft.original_email, email.id),
              attachments: draft.attachments || [],
            });
            setIsForwardOpen(true);
          }
          break;
          
        case 'compose':
        default:
          setEditingDraft({
            id: email.id,
            draft_type: 'compose',
            to: cleanTo,
            cc: cleanCc,
            bcc: cleanBcc,
            subject: draft.subject || '',
            body_html: cleanBody,
            attachments: draft.attachments || [],
          });
          setIsComposeOpen(true);
          break;
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  }, []);

  // Handle compose modal close
  const handleComposeClose = useCallback(() => {
    setIsComposeOpen(false);
    setEditingDraft(null);
  }, []);

  // Handle reply modal close
  const handleReplyClose = useCallback(() => {
    setIsReplyOpen(false);
    setEditingDraft(null);
  }, []);

  // Handle forward modal close
  const handleForwardClose = useCallback(() => {
    setIsForwardOpen(false);
    setEditingDraft(null);
  }, []);

  // Handle new compose (not editing)
  const handleNewCompose = useCallback(() => {
    setEditingDraft(null);
    setIsComposeOpen(true);
  }, []);

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

  // Handle close undo toast
  const handleCloseEmailUndoToast = useCallback(() => {
    setEmailUndoToast(null);
  }, []);

  // Handle checkbox change for individual email
  const handleCheckChange = useCallback((email: Email, checked: boolean) => {
    setCheckedEmails(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(email.id);
      } else {
        newSet.delete(email.id);
      }
      return newSet;
    });
  }, []);

  // Handle global checkbox change
  const handleGlobalCheckChange = useCallback(() => {
    if (checkedEmails.size > 0) {
      setCheckedEmails(new Set());
    } else {
      const allIds = new Set(emails.map(e => e.id));
      setCheckedEmails(allIds);
    }
  }, [checkedEmails.size, emails]);

  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-[#1a1a1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!currentUser) return null;

  // Get compose draft data if editing
  const composeDraft = editingDraft?.draft_type === 'compose' ? editingDraft : null;
  const replyDraft = editingDraft?.draft_type === 'reply' ? editingDraft : null;
  const forwardDraft = editingDraft?.draft_type === 'forward' ? editingDraft : null;

  return (
    <>
      <div className="fixed inset-0 bg-[#1a1a1a]">
        <Sidebar 
          activePage="drafts"
          userEmail={currentUser?.email || ""}
          userName={userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ""}`.trim() : undefined}
          avatarLetter={userProfile?.firstName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || "U"}
        />
        
        {/* Mobile/Tablet: Sidebar Component */}
        <MobileSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activePage="drafts"
          userProfile={userProfile}
          currentUser={currentUser}
        />

        {/* Main Content Area */}
        <div className="lg:ml-20 h-full flex flex-col">
          {/* Top Navigation Bar */}
          <nav className="flex-shrink-0 border-b border-zinc-700/50">
            {/* Mobile Header */}
            <div className="flex lg:hidden items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <span className="text-white font-medium text-sm">Drafts</span>
              </div>

              <div className="flex items-center">
                <button onClick={() => setIsSearchOpen(true)} className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white" title="Search">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                    <path d="M480 272C480 317.9 465.1 360.3 440 394.7L566.6 521.4C579.1 533.9 579.1 554.2 566.6 566.7C554.1 579.2 533.8 579.2 521.3 566.7L394.7 440C360.3 465.1 317.9 480 272 480C157.1 480 64 386.9 64 272C64 157.1 157.1 64 272 64C386.9 64 480 157.1 480 272zM272 416C351.5 416 416 351.5 416 272C416 192.5 351.5 128 272 128C192.5 128 128 192.5 128 272C128 351.5 192.5 416 272 416z"/>
                  </svg>
                </button>
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
                <div className="h-5 flex items-center">
                  <input
                    type="checkbox"
                    checked={checkedEmails.size > 0 && checkedEmails.size === emails.length}
                    onChange={handleGlobalCheckChange}
                    className="w-4 h-4 rounded bg-transparent cursor-pointer appearance-none border-2 border-gray-400 outline-none focus:outline-none focus:ring-0 relative checked:border-black checked:after:content-['✓'] checked:after:absolute checked:after:text-black checked:after:text-xs checked:after:font-bold checked:after:left-1/2 checked:after:top-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2"
                  />
                </div>
                <span className="text-[#8FA8A3] font-medium text-sm">Drafts</span>
                <span className="text-zinc-500 text-sm">{emails.length} drafts</span>
              </div>

              <div className="flex items-center gap-1 pb-4">
                <button onClick={() => setIsSearchOpen(true)} className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white" title="Search">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                    <path d="M480 272C480 317.9 465.1 360.3 440 394.7L566.6 521.4C579.1 533.9 579.1 554.2 566.6 566.7C554.1 579.2 533.8 579.2 521.3 566.7L394.7 440C360.3 465.1 317.9 480 272 480C157.1 480 64 386.9 64 272C64 157.1 157.1 64 272 64C386.9 64 480 157.1 480 272zM272 416C351.5 416 416 351.5 416 272C416 192.5 351.5 128 272 128C192.5 128 128 192.5 128 272C128 351.5 192.5 416 272 416z"/>
                  </svg>
                </button>
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

          {/* Main Content Area - Email List */}
          <div className="flex-1 flex overflow-hidden">
            <div className="w-full overflow-y-auto hide-scrollbar">
              <EmailList
                emails={emails}
                loading={emailsLoading}
                error={emailsError}
                selectedEmailId={null}
                isCompact={false}
                onEmailClick={handleEmailClick}
                showMarkDone={false}
                checkedEmailIds={checkedEmails}
                onCheckChange={handleCheckChange}
              />
            </div>
          </div>
        </div>
        
        {/* Compose Modal */}
        <ComposeModal
          key={composeDraft?.id || (undoComposeData?.type === 'compose' ? 'undo' : 'new')}
          isOpen={isComposeOpen}
          onClose={() => {
            handleComposeClose();
            setUndoComposeData(null);
          }}
          userEmail={currentUser?.email || ''}
          userTimezone={backendUserData?.timezone}
          onEmailSent={handleEmailSent}
          draftId={composeDraft?.id}
          initialTo={composeDraft?.to || (undoComposeData?.type === 'compose' ? undoComposeData.to : undefined)}
          initialCc={composeDraft?.cc || (undoComposeData?.type === 'compose' ? undoComposeData.cc : undefined)}
          initialBcc={composeDraft?.bcc || (undoComposeData?.type === 'compose' ? undoComposeData.bcc : undefined)}
          initialSubject={composeDraft?.subject || (undoComposeData?.type === 'compose' ? undoComposeData.subject : undefined)}
          initialBody={composeDraft?.body_html || (undoComposeData?.type === 'compose' ? undoComposeData.body_html : undefined)}
          initialAttachments={undoComposeData?.type === 'compose' ? undoComposeData.attachments : undefined}
        />

        {/* Reply Modal */}
        {/* Reply Modal - from draft */}
        {isReplyOpen && replyDraft && (
          <ReplyModal
            key={replyDraft.id || 'draft'}
            isOpen={isReplyOpen}
            onClose={() => {
              handleReplyClose();
              setUndoComposeData(null);
            }}
            mode={replyDraft.reply_mode}
            originalEmail={replyDraft.original_email}
            threadId={replyDraft.thread_id}
            threadSubject={replyDraft.subject.replace(/^Re:\s*/i, '')}
            messageId={replyDraft.message_id}
            userEmail={currentUser?.email || ''}
            userTimezone={backendUserData?.timezone}
            onEmailSent={handleEmailSent}
            draftId={replyDraft.id}
            initialTo={replyDraft.to}
            initialCc={replyDraft.cc}
            initialBody={replyDraft.body_html}
            initialAttachments={replyDraft.attachments.map(a => ({
              id: a.id,
              name: a.name,
              size: a.size,
              type: a.type,
              status: 'uploaded' as const
            }))}
          />
        )}

        {/* Reply Modal - from undo */}
        {isReplyOpen && !replyDraft && undoComposeData?.type === 'reply' && undoComposeData.originalEmail && (
          <ReplyModal
            key="undo"
            isOpen={isReplyOpen}
            onClose={() => {
              setIsReplyOpen(false);
              setUndoComposeData(null);
            }}
            mode={undoComposeData.replyMode || 'reply'}
            originalEmail={undoComposeData.originalEmail as Email}
            threadId={undoComposeData.threadId || ''}
            threadSubject={undoComposeData.subject.replace(/^Re:\s*/i, '')}
            messageId={undoComposeData.messageId}
            userEmail={currentUser?.email || ''}
            userTimezone={backendUserData?.timezone}
            onEmailSent={handleEmailSent}
            initialTo={undoComposeData.to}
            initialCc={undoComposeData.cc}
            initialBody={undoComposeData.body_html}
            initialAttachments={undoComposeData.attachments}
          />
        )}

        {/* Forward Modal - from draft */}
        {isForwardOpen && forwardDraft && (
          <ForwardModal
            key={forwardDraft.id || 'draft'}
            isOpen={isForwardOpen}
            onClose={() => {
              handleForwardClose();
              setUndoComposeData(null);
            }}
            originalEmail={forwardDraft.original_email}
            threadId={forwardDraft.thread_id}
            threadSubject={forwardDraft.subject.replace(/^Fwd:\s*/i, '')}
            userEmail={currentUser?.email || ''}
            userTimezone={backendUserData?.timezone}
            onEmailSent={handleEmailSent}
            draftId={forwardDraft.id}
            initialTo={forwardDraft.to}
            initialCc={forwardDraft.cc}
            initialBody={forwardDraft.body_html}
            initialAttachments={forwardDraft.attachments.map(a => ({
              id: a.id,
              name: a.name,
              size: a.size,
              type: a.type,
              status: 'uploaded' as const
            }))}
          />
        )}

        {/* Forward Modal - from undo */}
        {isForwardOpen && !forwardDraft && undoComposeData?.type === 'forward' && undoComposeData.originalEmail && (
          <ForwardModal
            key="undo"
            isOpen={isForwardOpen}
            onClose={() => {
              setIsForwardOpen(false);
              setUndoComposeData(null);
            }}
            originalEmail={undoComposeData.originalEmail as Email}
            threadId={undoComposeData.threadId || ''}
            threadSubject={undoComposeData.subject.replace(/^Fwd:\s*/i, '')}
            userEmail={currentUser?.email || ''}
            userTimezone={backendUserData?.timezone}
            onEmailSent={handleEmailSent}
            initialTo={undoComposeData.to}
            initialCc={undoComposeData.cc}
            initialBody={undoComposeData.body_html}
            initialAttachments={undoComposeData.attachments}
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

export default DraftPage;