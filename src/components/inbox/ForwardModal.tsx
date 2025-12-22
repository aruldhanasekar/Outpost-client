// ForwardModal.tsx - Forward email modal
// Separate from ReplyModal for cleaner separation of concerns
// Features: Empty recipients, Fwd: subject, forwarded message quote, original attachments

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Minus, Send, Loader2, GripHorizontal, Calendar } from 'lucide-react';
import { TiptapEditor, TiptapEditorRef, AttachedFile } from './TiptapEditor';
import { EmailChipInput } from './EmailChipInput';
import { SendLaterModal } from './SendLaterModal';
import { forwardEmail } from '@/services/replyForwardApi';
import { uploadAttachment, deleteAttachment, UploadProgress } from '@/services/attachmentApi';
import { Email } from './types';

interface ForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalEmail: Email;
  threadId: string;
  threadSubject: string;
  userEmail: string;
  userTimezone?: string;
  onEmailSent?: (emailId: string, recipients: string[]) => void;
  onEmailScheduled?: (emailId: string, scheduledAt: Date, recipients: string[]) => void;
  // Optional: Pre-loaded attachments from original email
  originalAttachments?: AttachedFile[];
}

interface Position {
  x: number;
  y: number;
}

// Constants for file limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB total

// Helper: Get subject with Fwd: prefix (avoid duplicates)
function getForwardSubject(subject: string): string {
  const cleanSubject = subject.replace(/^(Re:|Fwd:|Fw:)\s*/gi, '').trim();
  return `Fwd: ${cleanSubject}`;
}

// Helper: Generate forwarded content HTML
function generateForwardQuote(email: Email): string {
  // DEBUG: Log email.to to find the issue
  console.log('🔍 DEBUG generateForwardQuote:');
  console.log('   email.to =', email.to);
  console.log('   typeof email.to =', typeof email.to);
  console.log('   Array.isArray(email.to) =', Array.isArray(email.to));
  console.log('   email.senderEmail =', email.senderEmail);
  console.log('   Full email object =', email);
  
  return `
<br><br>
<div style="color: #666;">
  <p style="margin: 0; font-size: 12px;">---------- Forwarded message ---------</p>
  <p style="margin: 4px 0; font-size: 12px;">From: ${email.sender} &lt;${email.senderEmail}&gt;</p>
  <p style="margin: 4px 0; font-size: 12px;">Date: ${email.date} at ${email.time}</p>
  <p style="margin: 4px 0; font-size: 12px;">Subject: ${email.subject}</p>
  ${email.to && email.to.length > 0 ? `<p style="margin: 4px 0; font-size: 12px;">To: ${email.to.join(', ')}</p>` : ''}
  <br>
  <div>${email.body}</div>
</div>`;
}

export function ForwardModal({ 
  isOpen, 
  onClose, 
  originalEmail, 
  threadId, 
  threadSubject,
  userEmail, 
  userTimezone = 'UTC', 
  onEmailSent, 
  onEmailScheduled,
  originalAttachments = []
}: ForwardModalProps) {
  // DEBUG: Log originalEmail when modal renders
  console.log('🔍 DEBUG ForwardModal render:');
  console.log('   isOpen =', isOpen);
  console.log('   originalEmail =', originalEmail);
  console.log('   originalEmail.to =', originalEmail?.to);
  console.log('   typeof originalEmail.to =', typeof originalEmail?.to);
  
  // Get initial values
  const initialSubject = originalEmail ? getForwardSubject(threadSubject) : '';
  const initialQuote = originalEmail ? generateForwardQuote(originalEmail) : '';
  
  // Form state - Forward starts with empty recipients
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [subject, setSubject] = useState(initialSubject);
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [attachments, setAttachments] = useState<AttachedFile[]>(originalAttachments);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  
  // UI state
  const [showCc, setShowCc] = useState(false);
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
  const uploadFile = useCallback(async (file: AttachedFile): Promise<void> => {
    if (!file.file) return;
    
    try {
      // Update status to uploading
      setAttachments(prev => prev.map(a => 
        a.id === file.id ? { ...a, status: 'uploading' as const, progress: 0 } : a
      ));
      
      // Upload with progress callback
      const result = await uploadAttachment(
        file.file,
        (progress: UploadProgress) => {
          setAttachments(prev => prev.map(a => 
            a.id === file.id ? { ...a, progress: progress.percentage } : a
          ));
        }
      );
      
      // Update with server response
      setAttachments(prev => prev.map(a => 
        a.id === file.id ? { 
          ...a, 
          id: result.id,
          status: 'uploaded' as const, 
          progress: 100,
          file: undefined
        } : a
      ));
    } catch (err) {
      console.error('Upload failed:', err);
      setAttachments(prev => prev.map(a => 
        a.id === file.id ? { 
          ...a, 
          status: 'error' as const, 
          error: err instanceof Error ? err.message : 'Upload failed'
        } : a
      ));
    }
  }, []);
  
  // Handle attachments change from TiptapEditor
  const handleAttachmentsChange = useCallback((files: AttachedFile[]) => {
    // Calculate current total size
    const currentTotal = attachments.reduce((sum, a) => sum + a.size, 0);
    
    // Filter new files
    const newFiles = files.filter(f => !attachments.find(a => a.id === f.id));
    
    // Validate new files
    const validFiles: AttachedFile[] = [];
    let runningTotal = currentTotal;
    
    for (const file of newFiles) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`File "${file.name}" exceeds 10MB limit`);
        continue;
      }
      if (runningTotal + file.size > MAX_TOTAL_SIZE) {
        setError('Total attachments exceed 20MB limit');
        break;
      }
      validFiles.push(file);
      runningTotal += file.size;
    }
    
    if (validFiles.length > 0) {
      setAttachments(prev => [...prev, ...validFiles]);
      // Start uploading new files
      validFiles.forEach(file => uploadFile(file));
    }
  }, [attachments, uploadFile]);
  
  // Handle attachment removal
  const handleRemoveAttachment = useCallback(async (id: string) => {
    const attachment = attachments.find(a => a.id === id);
    
    // If uploaded, delete from S3
    if (attachment?.status === 'uploaded' && !attachment.id.startsWith('temp-')) {
      try {
        await deleteAttachment(attachment.id);
      } catch (err) {
        console.error('Failed to delete attachment:', err);
      }
    }
    
    setAttachments(prev => prev.filter(a => a.id !== id));
    setError(null);
  }, [attachments]);
  
  // Validate form - check recipients and uploading status
  const isFormValid = useCallback((): boolean => {
    if (to.length === 0) return false;
    // Check if any attachments are still uploading
    const isUploading = attachments.some(a => a.status === 'uploading' || a.status === 'pending');
    if (isUploading) return false;
    return true;
  }, [to, attachments]);
  
  // Handle send
  const handleSend = async () => {
    // Validation
    if (to.length === 0) {
      setError('Please add at least one recipient');
      return;
    }
    
    // Check if any uploads are still in progress
    if (attachments.some(a => a.status === 'uploading' || a.status === 'pending')) {
      setError('Please wait for attachments to finish uploading');
      return;
    }
    
    // Check for failed uploads
    if (attachments.some(a => a.status === 'error')) {
      setError('Please remove failed attachments before sending');
      return;
    }
    
    setIsSending(true);
    setError(null);
    
    try {
      // Build email content with forwarded quote
      const fullBodyHtml = bodyHtml + initialQuote;
      const fullBodyText = bodyText + '\n\n---------- Forwarded message ---------\n' +
        `From: ${originalEmail.sender} <${originalEmail.senderEmail}>\n` +
        `Date: ${originalEmail.date} at ${originalEmail.time}\n` +
        `Subject: ${originalEmail.subject}\n` +
        (originalEmail.to ? `To: ${originalEmail.to.join(', ')}\n` : '') +
        '\n' + originalEmail.body.replace(/<[^>]*>/g, '');
      
      // Get uploaded attachment IDs
      const attachmentIds = attachments
        .filter(a => a.status === 'uploaded')
        .map(a => a.id);
      
      // Send forward using new API
      const result = await forwardEmail({
        to,
        cc: cc.length > 0 ? cc : [],
        bcc: bcc.length > 0 ? bcc : [],
        subject,
        body_html: fullBodyHtml,
        body_text: fullBodyText,
        scheduled_at: scheduledAt?.toISOString(),
        tracking_enabled: true,
        attachment_ids: attachmentIds.length > 0 ? attachmentIds : []
      });
      
      console.log(scheduledAt ? '📅 Forward scheduled:' : '➡️ Forward sent:', result);
      
      // Notify parent
      if (scheduledAt) {
        onEmailScheduled?.(result.email_id, scheduledAt, to);
      } else {
        onEmailSent?.(result.email_id, to);
      }
      
      // Close modal
      onClose();
    } catch (err) {
      console.error('Failed to send email:', err);
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };
  
  // Handle discard/close
  const handleDiscard = () => {
    // Clean up uploaded attachments
    attachments
      .filter(a => a.status === 'uploaded' && !a.id.startsWith('temp-'))
      .forEach(a => {
        deleteAttachment(a.id).catch(console.error);
      });
    
    onClose();
  };
  
  // Handle Send Later
  const handleSendLater = () => {
    setShowSendLaterModal(true);
  };
  
  // Handle schedule selection
  const handleScheduleSelect = (date: Date) => {
    setScheduledAt(date);
    setShowSendLaterModal(false);
  };
  
  // Handle clear schedule
  const handleClearSchedule = () => {
    setScheduledAt(null);
  };
  
  // Keyboard shortcuts - stop propagation to prevent global shortcuts
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
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Format scheduled time for display
  const formatScheduledTime = (date: Date): string => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: userTimezone
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
          data-modal="forward"
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
              <h2 className="text-base font-semibold text-white">Forward</h2>
            </div>
            <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
              {/* Minimize button */}
              <button 
                className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
                title="Minimize"
              >
                <Minus className="w-4 h-4" />
              </button>
              {/* Close button */}
              <button 
                onClick={handleDiscard}
                className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Form Fields */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* To Field */}
            <div className="relative">
              <EmailChipInput
                emails={to}
                onChange={setTo}
                placeholder="recipient@example.com"
                label="To"
                autoFocus={true}
              />
              {/* Cc/Bcc toggle */}
              {!showCc && !showBcc && (
                <button
                  onClick={() => { setShowCc(true); setShowBcc(true); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Cc Bcc
                </button>
              )}
            </div>
            
            {/* CC Field - Optional */}
            {showCc && (
              <EmailChipInput
                emails={cc}
                onChange={setCc}
                placeholder="cc@example.com"
                label="Cc"
              />
            )}
            
            {/* BCC Field - Optional */}
            {showBcc && (
              <EmailChipInput
                emails={bcc}
                onChange={setBcc}
                placeholder="bcc@example.com"
                label="Bcc"
              />
            )}
            
            {/* Subject Field */}
            <div className="flex items-center gap-3 px-5 py-2.5 border-b border-zinc-700/30">
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
                placeholder="Add a message..."
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
                    title="Clear schedule"
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
            
            {/* Right side - Send button */}
            <button
              onClick={handleSend}
              disabled={isSending || !isFormValid()}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all
                ${isSending || !isFormValid()
                  ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                  : 'bg-[#f7ac5c] text-zinc-900 hover:bg-[#f9bc7c] active:scale-[0.98]'
                }
              `}
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
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
      {showSendLaterModal && (
        <SendLaterModal
          isOpen={showSendLaterModal}
          onClose={() => setShowSendLaterModal(false)}
          onSchedule={handleScheduleSelect}
          userTimezone={userTimezone}
        />
      )}
      
      {/* Keyboard Shortcuts Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-12 bg-[#1a1a1a] border-t border-zinc-800 flex items-center justify-center gap-8 px-4 z-40">
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-400 font-mono">
            {isMac ? '⌘' : 'Ctrl'}+B
          </kbd>
          <span className="text-xs text-zinc-500">Bold</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-400 font-mono">
            {isMac ? '⌘' : 'Ctrl'}+I
          </kbd>
          <span className="text-xs text-zinc-500">Italic</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-400 font-mono">
            {isMac ? '⌘' : 'Ctrl'}+U
          </kbd>
          <span className="text-xs text-zinc-500">Underline</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-400 font-mono">
            {isMac ? '⌘' : 'Ctrl'}+K
          </kbd>
          <span className="text-xs text-zinc-500">Link</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-400 font-mono">
            {isMac ? '⌘' : 'Ctrl'}+Enter
          </kbd>
          <span className="text-xs text-zinc-500">Send</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-400 font-mono">
            Esc
          </kbd>
          <span className="text-xs text-zinc-500">Close</span>
        </div>
      </div>
    </>
  );
}