// ReplyModal.tsx - Reply and Reply All email modal
// Separate from ComposeModal for cleaner separation of concerns
// Supports: Reply, Reply All modes
// Features: Pre-filled recipients/subject, quoted content, Send Later, Undo support

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Minus, Send, Loader2, GripHorizontal, Calendar } from 'lucide-react';
import { TiptapEditor, TiptapEditorRef, AttachedFile } from './TiptapEditor';
import { EmailChipInput } from './EmailChipInput';
import { SendLaterModal } from './SendLaterModal';
import { replyEmail } from '@/services/replyForwardApi';
import { uploadAttachment, deleteAttachment, UploadProgress } from '@/services/attachmentApi';
import { saveDraft, deleteDraft, isDraftWorthSaving } from '@/services/draftApi';
import { Email } from './types';

type ReplyMode = 'reply' | 'replyAll';

interface ReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ReplyMode;
  originalEmail: Email;
  threadId: string;
  threadSubject: string;
  messageId?: string;          // Gmail Message-ID for In-Reply-To header (optional for backwards compat)
  userEmail: string;
  userTimezone?: string;
  onEmailSent?: (emailId: string, recipients: string[]) => void;
  onEmailScheduled?: (emailId: string, scheduledAt: Date, recipients: string[]) => void;
  // Draft mode props
  draftId?: string;
  initialTo?: string[];
  initialCc?: string[];
  initialBody?: string;
  initialAttachments?: AttachedFile[];
}

interface Position {
  x: number;
  y: number;
}

// Constants for file limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB total

// Helper: Get modal title based on mode
function getModalTitle(mode: ReplyMode): string {
  switch (mode) {
    case 'reply': return 'Reply';
    case 'replyAll': return 'Reply All';
  }
}

// Helper: Get subject with Re: prefix (avoid duplicates)
function getSubjectWithPrefix(subject: string): string {
  const cleanSubject = subject.replace(/^(Re:|Fwd:|Fw:)\s*/gi, '').trim();
  return `Re: ${cleanSubject}`;
}

// Helper: Generate quoted content HTML for Reply/Reply All
function generateReplyQuote(email: Email): string {
  const quoteHeader = `On ${email.date} at ${email.time}, ${email.sender} &lt;${email.senderEmail}&gt; wrote:`;
  
  return `
<br><br>
<div style="border-left: 2px solid #ccc; padding-left: 12px; margin-left: 0; color: #666;">
  <p style="margin: 0 0 8px 0; color: #999; font-size: 12px;">
    ${quoteHeader}
  </p>
  <div>${email.body}</div>
</div>`;
}

// Helper: Extract email address from "Name <email>" format
function extractEmailAddress(str: string): string {
  if (!str) return '';
  const match = str.match(/<(.+)>/);
  return match ? match[1] : str;
}

// Helper: Get initial recipients based on mode
function getInitialRecipients(
  mode: ReplyMode, 
  originalEmail: Email, 
  userEmail: string
): { to: string[]; cc: string[] } {
  const userEmailLower = userEmail.toLowerCase();
  
  if (mode === 'reply') {
    // Reply to sender only
    return {
      to: originalEmail.senderEmail ? [originalEmail.senderEmail] : [],
      cc: []
    };
  }
  
  // Reply All: Reply to sender + all other recipients (excluding self)
  const toRecipients: string[] = [];
  const ccRecipients: string[] = [];
  
  // Add original sender to To
  if (originalEmail.senderEmail && originalEmail.senderEmail.toLowerCase() !== userEmailLower) {
    toRecipients.push(originalEmail.senderEmail);
  }
  
  // Add other recipients to CC (excluding self)
  if (originalEmail.to && Array.isArray(originalEmail.to)) {
    originalEmail.to.forEach(recipient => {
      const email = extractEmailAddress(recipient);
      if (email && email.toLowerCase() !== userEmailLower && !toRecipients.includes(email)) {
        ccRecipients.push(email);
      }
    });
  }
  
  return { to: toRecipients, cc: ccRecipients };
}

export function ReplyModal({ 
  isOpen, 
  onClose, 
  mode, 
  originalEmail, 
  threadId, 
  threadSubject,
  messageId,
  userEmail, 
  userTimezone = 'UTC', 
  onEmailSent, 
  onEmailScheduled,
  draftId: initialDraftId,
  initialTo,
  initialCc,
  initialBody,
  initialAttachments
}: ReplyModalProps) {
  // Draft state
  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>(initialDraftId);
  
  // Get initial values based on mode (memoized to prevent unnecessary recalculations)
  const initialRecipients = useMemo(() => {
    // Use draft values if provided, otherwise compute from originalEmail
    if (initialTo || initialCc) {
      return { to: initialTo || [], cc: initialCc || [] };
    }
    return originalEmail 
      ? getInitialRecipients(mode, originalEmail, userEmail)
      : { to: [], cc: [] };
  }, [mode, originalEmail, userEmail, initialTo, initialCc]);
  
  const initialSubject = useMemo(() => getSubjectWithPrefix(threadSubject), [threadSubject]);
  
  const initialQuote = useMemo(() => {
    return originalEmail ? generateReplyQuote(originalEmail) : '';
  }, [originalEmail]);
  
  // Form state
  const [to, setTo] = useState<string[]>(initialRecipients.to);
  const [cc, setCc] = useState<string[]>(initialRecipients.cc);
  const [bcc, setBcc] = useState<string[]>([]);
  const [subject, setSubject] = useState(initialSubject);
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [attachments, setAttachments] = useState<AttachedFile[]>(initialAttachments || []);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  
  // UI state
  const [showCc, setShowCc] = useState(initialRecipients.cc.length > 0);
  const [showBcc, setShowBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSendLaterModal, setShowSendLaterModal] = useState(false);
  
  // Drag state
  const [position, setPosition] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Refs
  const editorRef = useRef<TiptapEditorRef>(null);
  
  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset all form state when modal closes
      setTo([]);
      setCc([]);
      setBcc([]);
      setSubject('');
      setBodyHtml('');
      setBodyText('');
      setShowCc(false);
      setShowBcc(false);
      setError(null);
      setAttachments([]);
      setPosition(null);
      setScheduledAt(null);
      setShowSendLaterModal(false);
      setCurrentDraftId(undefined);
      editorRef.current?.clear();
    }
  }, [isOpen]);
  
  // Handle drag start
  const handleDragStart = (e: React.MouseEvent) => {
    if (!modalRef.current) return;
    
    const rect = modalRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  };
  
  // Handle drag move
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Constrain to viewport
      const maxX = window.innerWidth - (modalRef.current?.offsetWidth || 750);
      const maxY = window.innerHeight - 48 - (modalRef.current?.offsetHeight || 550);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);
  
  // Upload file to S3
  const uploadFileToS3 = useCallback(async (attachment: AttachedFile) => {
    if (!attachment.file) return;
    
    // Update status to uploading
    setAttachments(prev => prev.map(a => 
      a.id === attachment.id 
        ? { ...a, status: 'uploading' as const, progress: 0 }
        : a
    ));
    
    try {
      const result = await uploadAttachment(
        attachment.file,
        (progress: UploadProgress) => {
          // Update progress
          setAttachments(prev => prev.map(a => 
            a.id === attachment.id 
              ? { ...a, progress: progress.percentage }
              : a
          ));
        }
      );
      
      // Update with real ID from server
      setAttachments(prev => prev.map(a => 
        a.id === attachment.id 
          ? { 
              ...a, 
              id: result.id,  // Real attachment ID from S3
              status: 'uploaded' as const, 
              progress: 100,
              file: undefined  // Clear file reference
            }
          : a
      ));
      
      console.log(`✅ Uploaded: ${attachment.name}`);
      
    } catch (err) {
      console.error(`❌ Upload failed: ${attachment.name}`, err);
      
      // Update status to error
      setAttachments(prev => prev.map(a => 
        a.id === attachment.id 
          ? { 
              ...a, 
              status: 'error' as const, 
              error: err instanceof Error ? err.message : 'Upload failed'
            }
          : a
      ));
    }
  }, []);
  
  // Handle attachment changes from editor
  const handleAttachmentsChange = useCallback((newAttachments: AttachedFile[]) => {
    const currentIds = new Set(attachments.map(a => a.id));
    const newlyAdded = newAttachments.filter(a => !currentIds.has(a.id));
    
    for (const attachment of newlyAdded) {
      if (attachment.size > MAX_FILE_SIZE) {
        setError(`File "${attachment.name}" is too large. Maximum size is 10MB.`);
        setAttachments(prev => prev.filter(a => a.id !== attachment.id));
        continue;
      }
      
      const currentTotal = attachments.reduce((sum, a) => sum + a.size, 0);
      if (currentTotal + attachment.size > MAX_TOTAL_SIZE) {
        setError('Total attachment size exceeds 20MB limit.');
        setAttachments(prev => prev.filter(a => a.id !== attachment.id));
        continue;
      }
      
      if (attachment.file && attachment.status === 'pending') {
        uploadFileToS3(attachment);
      }
    }
    
    setAttachments(newAttachments);
  }, [attachments, uploadFileToS3]);
  
  // Handle remove attachment
  const handleRemoveAttachment = useCallback(async (attachmentId: string) => {
    const attachment = attachments.find(a => a.id === attachmentId);
    
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    
    if (attachment && attachment.status === 'uploaded' && !attachmentId.startsWith('temp-')) {
      try {
        await deleteAttachment(attachmentId);
        console.log(`🗑️ Deleted from S3: ${attachment.name}`);
      } catch (err) {
        console.error(`⚠️ Failed to delete from S3: ${attachment.name}`, err);
      }
    }
  }, [attachments]);
  
  // Validate form
  const isFormValid = useCallback(() => {
    if (to.length === 0) return false;
    if (!subject.trim()) return false;
    // Check if any attachments are still uploading or pending
    const isUploading = attachments.some(a => a.status === 'uploading' || a.status === 'pending');
    if (isUploading) return false;
    return true;
  }, [to, subject, attachments]);
  
  // Handle send
  const handleSend = useCallback(async () => {
    setError(null);
    
    if (to.length === 0) {
      setError('Please add at least one recipient');
      return;
    }
    
    if (!subject.trim()) {
      setError('Please enter a subject');
      return;
    }
    
    const uploadingAttachments = attachments.filter(a => a.status === 'uploading');
    if (uploadingAttachments.length > 0) {
      setError('Please wait for attachments to finish uploading');
      return;
    }
    
    const failedAttachments = attachments.filter(a => a.status === 'error');
    if (failedAttachments.length > 0) {
      const retry = window.confirm(
        `${failedAttachments.length} attachment(s) failed to upload. Send without them?`
      );
      if (!retry) return;
    }
    
    setIsSending(true);
    
    // Get HTML and text from editor, append quoted content
    const editorHtml = editorRef.current?.getHTML() || '';
    const editorText = editorRef.current?.getText() || '';
    
    // Combine user's message with quoted content
    const fullHtml = editorHtml + initialQuote;
    const fullText = editorText + '\n\n' + 
      `On ${originalEmail.date}, ${originalEmail.sender} wrote:\n${originalEmail.body.replace(/<[^>]*>/g, '')}`;
    
    const attachmentIds = attachments
      .filter(a => a.status === 'uploaded' && !a.id.startsWith('temp-'))
      .map(a => a.id);
    
    try {
      // Use replyEmail API with threading support
      const response = await replyEmail({
        to,
        cc: cc.length > 0 ? cc : [],
        bcc: bcc.length > 0 ? bcc : [],
        subject,
        body_html: fullHtml,
        body_text: fullText,
        thread_id: threadId,           // Gmail thread ID for threading
        in_reply_to: messageId,        // Message-ID of email being replied to
        tracking_enabled: true,
        attachment_ids: attachmentIds,
        scheduled_at: scheduledAt ? scheduledAt.toISOString() : undefined
      });
      
      console.log(scheduledAt ? '📅 Reply scheduled:' : '📧 Reply sent:', response);
      console.log('Threaded to:', threadId);
      
      // Delete draft if this was a draft being sent
      if (currentDraftId) {
        try {
          await deleteDraft(currentDraftId);
          console.log('🗑️ Reply draft deleted after send:', currentDraftId);
        } catch (error) {
          console.error('⚠️ Failed to delete reply draft after send:', error);
        }
      }
      
      onClose();
      
      if (scheduledAt && onEmailScheduled) {
        onEmailScheduled(response.email_id, scheduledAt, to);
      } else if (onEmailSent && response.can_undo) {
        onEmailSent(response.email_id, to);
      }
      
    } catch (err) {
      console.error('Failed to send:', err);
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  }, [to, cc, bcc, subject, attachments, scheduledAt, threadId, messageId, originalEmail, initialQuote, onClose, onEmailSent, onEmailScheduled, currentDraftId]);
  
  // Handle discard - saves as draft if content exists
  const handleDiscard = useCallback(async () => {
    // Get current body content
    const currentBodyHtml = editorRef.current?.getHTML() || bodyHtml;
    const currentBodyText = editorRef.current?.getText() || bodyText;
    
    // Prepare draft data
    const draftData = {
      to,
      cc,
      bcc,
      subject,
      body_html: currentBodyHtml,
      body_plain: currentBodyText,
      attachments: attachments
        .filter(a => a.status === 'uploaded' && !a.id.startsWith('temp-'))
        .map(a => ({
          id: a.id,
          name: a.name,
          size: a.size,
          type: a.type
        })),
      draft_type: 'reply' as const,
      reply_mode: mode,
      thread_id: threadId,
      message_id: messageId,
      original_email: originalEmail ? {
        sender: originalEmail.sender,
        senderEmail: originalEmail.senderEmail,
        date: originalEmail.date,
        time: originalEmail.time,
        body: originalEmail.body,
        subject: originalEmail.subject,
        message_id: originalEmail.message_id
      } : undefined
    };
    
    // Only save draft if there's content worth saving (user typed something)
    const hasUserContent = currentBodyText.trim().length > 0;
    
    if (hasUserContent && isDraftWorthSaving(draftData)) {
      try {
        const savedDraftId = await saveDraft(draftData, currentDraftId);
        setCurrentDraftId(savedDraftId);
        console.log('💾 Reply draft auto-saved on close:', savedDraftId);
      } catch (error) {
        console.error('⚠️ Failed to save reply draft:', error);
      }
    } else {
      // No content - delete uploaded attachments from S3 if any
      const uploadedAttachments = attachments.filter(a => a.status === 'uploaded' && !a.id.startsWith('temp-'));
      for (const attachment of uploadedAttachments) {
        try {
          await deleteAttachment(attachment.id);
        } catch (err) {
          console.error(`⚠️ Failed to delete from S3: ${attachment.name}`, err);
        }
      }
    }
    
    onClose();
  }, [to, cc, bcc, subject, bodyHtml, bodyText, attachments, mode, threadId, messageId, originalEmail, currentDraftId, onClose]);
  
  // Handle keyboard shortcuts - stop propagation to prevent global shortcuts
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleDiscard();
        return;
      }
      
      // Cmd/Ctrl + Enter to send
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleSend();
        return;
      }
      
      // Block global shortcuts (R, F, A, D, etc.) from triggering Inbox actions
      // but don't preventDefault so typing still works
      const blockedKeys = ['r', 'f', 'a', 'd', 'u'];
      if (blockedKeys.includes(e.key.toLowerCase()) && !e.metaKey && !e.ctrlKey) {
        e.stopPropagation();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, handleSend, handleDiscard]);
  
  // Handle Send Later
  const handleSendLater = () => {
    setShowSendLaterModal(true);
  };
  
  const handleSchedule = (date: Date) => {
    setScheduledAt(date);
  };
  
  const handleClearSchedule = () => {
    setScheduledAt(null);
  };
  
  const formatScheduledTime = (date: Date): string => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
  
  if (!isOpen) return null;
  
  // Detect Mac for keyboard shortcut display
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  return (
    <>
      {/* Modal Container */}
      <div 
        className={`fixed z-50 pointer-events-none ${position ? '' : 'top-0 left-0 right-0 bottom-12 flex items-center justify-center p-4'}`}
        style={position ? { top: 0, left: 0, right: 0, bottom: 48 } : undefined}
      >
        <div 
          ref={modalRef}
          data-modal="reply"
          className={`pointer-events-auto bg-[#2d2d2d] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-shadow ${isDragging ? 'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]' : ''}`}
          style={{ 
            width: '100%',
            maxWidth: '750px',
            height: '550px',
            maxHeight: '88vh',
            ...(position ? {
              position: 'absolute',
              left: position.x,
              top: position.y,
            } : {})
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Draggable */}
          <div 
            className={`flex items-center justify-between px-5 py-4 border-b border-zinc-700/50 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={handleDragStart}
          >
            <div className="flex items-center gap-2">
              <GripHorizontal className="w-4 h-4 text-zinc-600" />
              <h2 className="text-base font-semibold text-white">{getModalTitle(mode)}</h2>
            </div>
            <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
              {/* Minimize button */}
              <div className="relative group">
                <button 
                  className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
                >
                  <Minus className="w-4 h-4" />
                </button>
                {/* Brand Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-zinc-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  Minimize
                </div>
              </div>
              {/* Close button */}
              <div className="relative group">
                <button 
                  onClick={handleDiscard}
                  className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
                {/* Brand Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-zinc-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  Close
                </div>
              </div>
            </div>
          </div>
          
          {/* Form Fields */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* To Field with Cc/Bcc toggle */}
            <div className="relative">
              <EmailChipInput
                emails={to}
                onChange={setTo}
                label="To"
              />
              {/* Cc/Bcc toggle */}
              {!showCc && !showBcc && (
                <button
                  onClick={() => { setShowCc(true); setShowBcc(true); }}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Cc Bcc
                </button>
              )}
            </div>
            
            {/* CC Field (conditional) */}
            {showCc && (
              <EmailChipInput
                emails={cc}
                onChange={setCc}
                label="Cc"
                placeholder="cc@example.com"
              />
            )}
            
            {/* BCC Field (conditional) */}
            {showBcc && (
              <EmailChipInput
                emails={bcc}
                onChange={setBcc}
                label="Bcc"
                placeholder="bcc@example.com"
              />
            )}
            
            {/* Subject Field */}
            <div className="flex items-center px-5 py-3 border-b border-zinc-700/30">
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-zinc-500"
              />
            </div>
            
            {/* Body Field - Rich Text Editor */}
            <div className="flex-1 flex flex-col overflow-y-auto min-h-0">
              <TiptapEditor
                ref={editorRef}
                placeholder="Write your reply..."
                onChange={(html, text) => {
                  setBodyHtml(html);
                  setBodyText(text);
                }}
                attachments={attachments}
                onAttachmentsChange={handleAttachmentsChange}
                onRemoveAttachment={handleRemoveAttachment}
              />
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-700/50">
            {/* Left side - Action buttons, error, or scheduled time */}
            <div className="flex items-center gap-4">
              {error ? (
                <p className="text-sm text-red-400">{error}</p>
              ) : scheduledAt ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg">
                  <Calendar className="w-4 h-4 text-[#f7ac5c]" />
                  <span className="text-sm text-white">
                    {formatScheduledTime(scheduledAt)}
                  </span>
                  <button
                    onClick={handleClearSchedule}
                    className="ml-1 p-0.5 hover:bg-zinc-700 rounded text-zinc-500 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSendLater}
                  className="text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  Send later
                </button>
              )}
            </div>
            
            {/* Right side - Send/Schedule button */}
            <button
              onClick={handleSend}
              disabled={isSending || !isFormValid()}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all
                ${isSending || !isFormValid()
                  ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                  : 'bg-[#f7ac5c] hover:bg-[#f5a043] text-white cursor-pointer'
                }
              `}
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{scheduledAt ? 'Scheduling...' : 'Sending...'}</span>
                </>
              ) : scheduledAt ? (
                <>
                  <Calendar className="w-4 h-4" />
                  <span>Schedule</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Send Later Modal */}
      <SendLaterModal
        isOpen={showSendLaterModal}
        onClose={() => setShowSendLaterModal(false)}
        onSchedule={handleSchedule}
        userTimezone={userTimezone}
      />
      
      {/* Keyboard Shortcuts Bar - same as ComposeModal */}
      <div className="hidden lg:flex fixed bottom-0 left-16 right-0 h-12 bg-[#1a1a1a] items-center justify-center gap-8 z-40">
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
    </>
  );
}