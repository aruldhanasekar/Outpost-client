// ComposeModal.tsx - Email compose modal
// Phase 1: Basic UI with To, Subject, Body fields
// Phase 2: Rich text editor with Tiptap + Attachments
// Phase 3: Multiple recipients with chip/tag style
// Phase 4: Backend API integration with undo support
// Phase 5: S3 Attachment upload support
// Draggable centered overlay design matching app theme

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Minus, Send, Loader2, GripHorizontal, Calendar, Edit3 } from 'lucide-react';
import { TiptapEditor, TiptapEditorRef, AttachedFile } from './TiptapEditor';
import { EmailChipInput } from './EmailChipInput';
import { SendLaterModal } from './SendLaterModal';
import { sendEmail } from '@/services/emailApi';
import { uploadAttachment, deleteAttachment, UploadProgress } from '@/services/attachmentApi';
import { auth } from '@/firebase.config';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  userTimezone?: string; // e.g., "Asia/Calcutta"
  onEmailSent?: (emailId: string, recipients: string[]) => void;  // Callback for undo toast
  onEmailScheduled?: (emailId: string, scheduledAt: Date, recipients: string[]) => void; // Callback for scheduled notification
  // Edit mode props (for editing scheduled emails)
  editMode?: boolean;
  editEmailId?: string;
  initialTo?: string[];
  initialCc?: string[];
  initialBcc?: string[];
  initialSubject?: string;
  initialBody?: string;
  initialScheduledAt?: string;
  onEmailUpdated?: (emailId: string) => void;
}

interface Position {
  x: number;
  y: number;
}

// Constants for file limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB total

export function ComposeModal({ 
  isOpen, 
  onClose, 
  userEmail, 
  userTimezone = 'UTC', 
  onEmailSent, 
  onEmailScheduled,
  editMode = false,
  editEmailId,
  initialTo,
  initialCc,
  initialBcc,
  initialSubject,
  initialBody,
  initialScheduledAt,
  onEmailUpdated
}: ComposeModalProps) {
  // Form state - arrays for multiple recipients
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState(''); // Plain text body
  const [bodyHtml, setBodyHtml] = useState(''); // HTML body for sending
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null); // Send Later date/time
  
  // UI state
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSendLaterModal, setShowSendLaterModal] = useState(false);
  
  // Drag state
  const [position, setPosition] = useState<Position | null>(null); // null = centered
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Refs
  const editorRef = useRef<TiptapEditorRef>(null);
  
  // Focus is handled by EmailChipInput autoFocus prop
  // No need for separate focus effect
  
  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTo([]);
      setCc([]);
      setBcc([]);
      setSubject('');
      setBody('');
      setBodyHtml('');
      setShowCc(false);
      setShowBcc(false);
      setError(null);
      setAttachments([]);
      setPosition(null); // Reset position to center
      setScheduledAt(null); // Reset scheduled time
      setShowSendLaterModal(false);
      // Clear editor content
      editorRef.current?.clear();
    }
  }, [isOpen]);
  
  // Initialize form fields when in edit mode
  useEffect(() => {
    if (isOpen && editMode) {
      // Set initial values from props
      if (initialTo && initialTo.length > 0) {
        setTo(initialTo);
      }
      if (initialCc && initialCc.length > 0) {
        setCc(initialCc);
        setShowCc(true);
      }
      if (initialBcc && initialBcc.length > 0) {
        setBcc(initialBcc);
        setShowBcc(true);
      }
      if (initialSubject) {
        setSubject(initialSubject);
      }
      if (initialBody) {
        setBodyHtml(initialBody);
        setBody(initialBody.replace(/<[^>]*>/g, '')); // Strip HTML for plain text
      }
      if (initialScheduledAt) {
        setScheduledAt(new Date(initialScheduledAt));
      }
    }
  }, [isOpen, editMode, initialTo, initialCc, initialBcc, initialSubject, initialBody, initialScheduledAt]);
  
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
      
      // Keep modal within viewport bounds
      const maxX = window.innerWidth - (modalRef.current?.offsetWidth || 700);
      const maxY = window.innerHeight - (modalRef.current?.offsetHeight || 500) - 48; // 48px for command bar
      
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
  
  // Validate form
  const isFormValid = useCallback((): boolean => {
    if (to.length === 0) return false;
    if (!subject.trim()) return false;
    // Check if any attachments are still uploading or pending
    const isUploading = attachments.some(a => a.status === 'uploading' || a.status === 'pending');
    if (isUploading) return false;
    return true;
  }, [to, subject, attachments]);
  
  // ======================================================
  // S3 ATTACHMENT UPLOAD
  // ======================================================
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
      
    } catch (error) {
      console.error(`❌ Upload failed: ${attachment.name}`, error);
      
      // Update status to error
      setAttachments(prev => prev.map(a => 
        a.id === attachment.id 
          ? { 
              ...a, 
              status: 'error' as const, 
              error: error instanceof Error ? error.message : 'Upload failed'
            }
          : a
      ));
    }
  }, []);
  
  // Handle attachments change from TiptapEditor
  const handleAttachmentsChange = useCallback((newAttachments: AttachedFile[]) => {
    // Find newly added attachments (ones that don't exist in current state)
    const currentIds = new Set(attachments.map(a => a.id));
    const newlyAdded = newAttachments.filter(a => !currentIds.has(a.id));
    
    // Validate and upload new attachments
    for (const attachment of newlyAdded) {
      // Validate size
      if (attachment.size > MAX_FILE_SIZE) {
        setError(`File "${attachment.name}" is too large. Maximum size is 10MB.`);
        // Remove this attachment
        setAttachments(prev => prev.filter(a => a.id !== attachment.id));
        continue;
      }
      
      // Check total size
      const currentTotal = attachments.reduce((sum, a) => sum + a.size, 0);
      if (currentTotal + attachment.size > MAX_TOTAL_SIZE) {
        setError('Total attachment size exceeds 20MB limit.');
        // Remove this attachment
        setAttachments(prev => prev.filter(a => a.id !== attachment.id));
        continue;
      }
      
      // Start upload if file exists
      if (attachment.file && attachment.status === 'pending') {
        uploadFileToS3(attachment);
      }
    }
    
    setAttachments(newAttachments);
  }, [attachments, uploadFileToS3]);
  
  // Handle remove attachment
  const handleRemoveAttachment = useCallback(async (attachmentId: string) => {
    const attachment = attachments.find(a => a.id === attachmentId);
    
    // Remove from UI immediately
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    
    // Delete from S3 if already uploaded
    if (attachment && attachment.status === 'uploaded' && !attachmentId.startsWith('temp-')) {
      try {
        await deleteAttachment(attachmentId);
        console.log(`🗑️ Deleted from S3: ${attachment.name}`);
      } catch (error) {
        console.error(`⚠️ Failed to delete from S3: ${attachment.name}`, error);
        // Don't re-add to UI, just log error
      }
    }
  }, [attachments]);
  
  // Handle send
  const handleSend = useCallback(async () => {
    setError(null);
    
    // Validate recipients
    if (to.length === 0) {
      setError('Please add at least one recipient');
      return;
    }
    
    if (!subject.trim()) {
      setError('Please enter a subject');
      return;
    }
    
    // Check if any attachments are still uploading
    const uploadingAttachments = attachments.filter(a => a.status === 'uploading');
    if (uploadingAttachments.length > 0) {
      setError('Please wait for attachments to finish uploading');
      return;
    }
    
    // Check for failed uploads
    const failedAttachments = attachments.filter(a => a.status === 'error');
    if (failedAttachments.length > 0) {
      const retry = window.confirm(
        `${failedAttachments.length} attachment(s) failed to upload. Send without them?`
      );
      if (!retry) return;
    }
    
    setIsSending(true);
    
    // Get HTML and text from editor
    const htmlBody = editorRef.current?.getHTML() || '';
    const textBody = editorRef.current?.getText() || '';
    
    // Get attachment IDs (only successfully uploaded ones)
    const attachmentIds = attachments
      .filter(a => a.status === 'uploaded' && !a.id.startsWith('temp-'))
      .map(a => a.id);
    
    try {
      if (editMode && editEmailId) {
        // Edit mode: Update existing scheduled email
        const user = auth.currentUser;
        if (!user) throw new Error('Not authenticated');
        const token = await user.getIdToken();
        
        const response = await fetch(`/api/scheduled/${editEmailId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to,
            cc: cc.length > 0 ? cc : [],
            bcc: bcc.length > 0 ? bcc : [],
            subject,
            body_html: htmlBody,
            body_text: textBody
          })
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.detail || 'Failed to update email');
        }
        
        console.log('✅ Scheduled email updated:', editEmailId);
        
        // Close modal
        onClose();
        
        // Notify parent
        if (onEmailUpdated) {
          onEmailUpdated(editEmailId);
        }
        
      } else {
        // Normal mode: Send new email
        const response = await sendEmail({
          to,
          cc: cc.length > 0 ? cc : [],
          bcc: bcc.length > 0 ? bcc : [],
          subject,
          body_html: htmlBody,
          body_text: textBody,
          tracking_enabled: true,
          attachment_ids: attachmentIds,
          scheduled_at: scheduledAt ? scheduledAt.toISOString() : null
        });
        
        console.log(scheduledAt ? '📅 Email scheduled:' : '📧 Email queued:', response);
        if (attachmentIds.length > 0) {
          console.log(`   📎 With ${attachmentIds.length} attachment(s)`);
        }
        
        // Close modal
        onClose();
        
        // Notify parent based on whether it's scheduled or immediate
        if (scheduledAt && onEmailScheduled) {
          onEmailScheduled(response.email_id, scheduledAt, to);
        } else if (onEmailSent && response.can_undo) {
          onEmailSent(response.email_id, to);
        }
      }
      
    } catch (err) {
      console.error('❌ Failed to send email:', err);
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  }, [to, cc, bcc, subject, attachments, scheduledAt, onClose, onEmailSent, onEmailScheduled, editMode, editEmailId, onEmailUpdated]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
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
  }, [isOpen, handleSend, onClose]);
  
  // Handle discard
  const handleDiscard = useCallback(async () => {
    // Delete uploaded attachments from S3
    const uploadedAttachments = attachments.filter(a => a.status === 'uploaded' && !a.id.startsWith('temp-'));
    for (const attachment of uploadedAttachments) {
      try {
        await deleteAttachment(attachment.id);
        console.log(`🗑️ Deleted from S3: ${attachment.name}`);
      } catch (error) {
        console.error(`⚠️ Failed to delete from S3: ${attachment.name}`, error);
      }
    }
    
    onClose();
  }, [attachments, onClose]);
  
  // Handle Send Later - opens modal
  const handleSendLater = () => {
    setShowSendLaterModal(true);
  };
  
  // Handle schedule selection from SendLaterModal
  const handleSchedule = (date: Date) => {
    setScheduledAt(date);
    console.log('📅 Scheduled for:', date.toISOString());
  };
  
  // Clear scheduled time
  const handleClearSchedule = () => {
    setScheduledAt(null);
  };
  
  // Format scheduled time for display - uses browser local time
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

  // Handle Remind Me
  const handleRemindMe = () => {
    // TODO: Implement remind me functionality
    console.log('⏰ Remind me clicked');
    alert('Remind me feature coming soon!');
  };
  
  // Handle Save to Draft
  const handleSaveDraft = () => {
    // TODO: Implement save to draft functionality
    const htmlBody = editorRef.current?.getHTML() || '';
    const textBody = editorRef.current?.getText() || '';
    
    console.log('💾 Saving draft:', { 
      to, cc, bcc, subject, 
      body: textBody, 
      bodyHtml: htmlBody,
      attachments: attachments.map(a => ({ name: a.name, size: a.size, id: a.id, status: a.status }))
    });
    alert('Draft saved! (simulated)');
  };
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* Modal Container - pointer-events-none so clicks pass through */}
      <div 
        className={`fixed z-50 pointer-events-none ${position ? '' : 'top-0 left-0 right-0 bottom-12 flex items-center justify-center p-4'}`}
        style={position ? { top: 0, left: 0, right: 0, bottom: 48 } : undefined}
      >
        <div 
          ref={modalRef}
          data-modal="compose"
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
              {editMode ? (
                <Edit3 className="w-4 h-4 text-[#f7ac5c]" />
              ) : (
                <GripHorizontal className="w-4 h-4 text-zinc-600" />
              )}
              <h2 className="text-base font-semibold text-white">
                {editMode ? 'Edit Scheduled Email' : 'New Message'}
              </h2>
            </div>
            <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
              {/* Minimize button - for future use */}
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
            {/* To Field with Cc/Bcc toggle */}
            <div className="relative">
              <EmailChipInput
                emails={to}
                onChange={setTo}
                label="To"
                placeholder="recipient@example.com"
                autoFocus={isOpen}
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
            
            {/* Subject Field - placeholder disappears when typing */}
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
                placeholder="Write your message..."
                initialContent={editMode ? initialBody : undefined}
                onChange={(html, text) => {
                  setBodyHtml(html);
                  setBody(text);
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
                // Show scheduled time with clear button
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
              ) : editMode ? (
                // Edit mode - no additional buttons (reschedule is separate)
                <span className="text-xs text-zinc-500">Editing scheduled email</span>
              ) : (
                // Normal action buttons
                <>
                  <button
                    onClick={handleSendLater}
                    className="text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    Send later
                  </button>
                  <button
                    onClick={handleSaveDraft}
                    className="text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    Save to draft
                  </button>
                </>
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
                  <span>{editMode ? 'Updating...' : (scheduledAt ? 'Scheduling...' : 'Sending...')}</span>
                </>
              ) : editMode ? (
                <>
                  <Edit3 className="w-4 h-4" />
                  <span>Update</span>
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
    </>
  );
}