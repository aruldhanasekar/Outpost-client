// SearchModal.tsx - Search modal with instant results and detail panel

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { 
  X, Search, Paperclip, Mail, Send, Archive, Trash2, Loader2,
  ChevronLeft, ChevronRight, Maximize2, Minimize2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { SearchableEmail } from './types';
import { SearchEmailCard, SearchEmailData } from './SearchEmailCard';
import { ReplyModal, ForwardModal, Email } from '@/components/inbox';
import { UndoEmailData } from '@/components/inbox/ComposeModal';
import { EmailSendUndoToast } from '@/components/ui/EmailSendUndoToast';
import { AttachedFile } from '@/components/inbox/TiptapEditor';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmailSelect?: (email: SearchableEmail) => void;
  userEmail?: string;
}

interface FullEmail extends SearchableEmail {
  body_html?: string;
  body_text?: string;
  cc?: string[];
  bcc?: string[];
  message_id?: string;
  attachments?: Array<{
    id?: string;
    filename: string;
    mimeType?: string;
    content_type?: string;
    size?: number;
    url?: string;
  }>;
}

// Parse search query into operators and keywords
function parseQuery(query: string) {
  const operators: { type: string; value: string }[] = [];
  let keywords: string[] = [];
  
  const operatorRegex = /(from|to|subject|has|in|is|category):(\S+)/gi;
  let remaining = query;
  let match;
  
  while ((match = operatorRegex.exec(query)) !== null) {
    operators.push({ 
      type: match[1].toLowerCase(), 
      value: match[2].toLowerCase() 
    });
    remaining = remaining.replace(match[0], '');
  }
  
  const quotedRegex = /"([^"]+)"/g;
  while ((match = quotedRegex.exec(remaining)) !== null) {
    keywords.push(match[1].toLowerCase());
    remaining = remaining.replace(match[0], '');
  }
  
  const words = remaining.trim().split(/\s+/).filter(w => w.length > 0);
  keywords = [...keywords, ...words.map(w => w.toLowerCase())];
  
  return { operators, keywords };
}

// Check if email matches query
function matchesQuery(email: SearchableEmail, operators: { type: string; value: string }[], keywords: string[]): boolean {
  for (const op of operators) {
    switch (op.type) {
      case 'from':
        if (!email.sender.toLowerCase().includes(op.value) && 
            !email.sender_email.toLowerCase().includes(op.value)) {
          return false;
        }
        break;
      case 'to': {
        const toMatch = email.recipients.some(r => r.toLowerCase().includes(op.value));
        if (!toMatch) return false;
        break;
      }
      case 'subject':
        if (!email.subject.toLowerCase().includes(op.value)) return false;
        break;
      case 'has':
        if (op.value === 'attachment' && !email.has_attachment) return false;
        break;
      case 'in':
        if (email.source !== op.value) return false;
        break;
      case 'is':
        if (op.value === 'unread' && email.is_read) return false;
        if (op.value === 'read' && !email.is_read) return false;
        break;
      case 'category':
        if (email.category.toLowerCase() !== op.value) return false;
        break;
    }
  }
  
  for (const keyword of keywords) {
    const searchable = `${email.subject} ${email.sender} ${email.sender_email} ${email.snippet}`.toLowerCase();
    if (!searchable.includes(keyword)) return false;
  }
  
  return true;
}

// Format date for list
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

// Source icon
function SourceIcon({ source }: { source: string }) {
  const className = "w-3.5 h-3.5";
  switch (source) {
    case 'sent': return <Send className={className} />;
    case 'done': return <Archive className={className} />;
    case 'trash': return <Trash2 className={className} />;
    default: return <Mail className={className} />;
  }
}

// Convert FullEmail to Email format for Reply/Forward modals
function convertToEmail(email: FullEmail): Email {
  const date = new Date(email.date);
  return {
    id: email.id,
    sender: email.sender || 'Unknown',
    senderEmail: email.sender_email,
    subject: email.subject,
    preview: email.snippet,
    body: email.body_html || email.body_text || email.snippet,
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    isRead: email.is_read,
    hasAttachment: email.has_attachment,
    message_id: email.message_id,
    to: email.recipients || [],
    attachments: email.attachments?.map(a => ({
      id: a.id || '',
      filename: a.filename,
      content_type: a.content_type || a.mimeType || 'application/octet-stream',
      size: a.size || 0,
      url: a.url
    }))
  };
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const { currentUser } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const hasFetchedRef = useRef(false);
  
  const [emails, setEmails] = useState<SearchableEmail[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Detail panel state
  const [selectedEmail, setSelectedEmail] = useState<FullEmail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Reply/Forward modal state
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [isForwardOpen, setIsForwardOpen] = useState(false);
  const [replyEmail, setReplyEmail] = useState<Email | null>(null);
  const [forwardEmail, setForwardEmail] = useState<Email | null>(null);
  
  // Undo state (like Inbox)
  const [undoComposeData, setUndoComposeData] = useState<UndoEmailData | null>(null);
  const [emailUndoToast, setEmailUndoToast] = useState<{
    show: boolean;
    emailId: string;
    recipients: string[];
    emailData: UndoEmailData;
  } | null>(null);
  
  // Pre-fetch emails when modal opens (for instant search)
  useEffect(() => {
    if (!isOpen || !currentUser || hasFetchedRef.current) return;
    
    const fetchEmails = async () => {
      setLoading(true);
      setError(null);
      hasFetchedRef.current = true;
      
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch(`${API_URL}/api/emails/searchable?limit=300`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (!response.ok) throw new Error('Failed to fetch');
        
        const data = await response.json();
        setEmails(data.emails || []);
      } catch (err) {
        setError('Failed to load emails');
        hasFetchedRef.current = false;
      } finally {
        setLoading(false);
      }
    };
    
    fetchEmails();
  }, [isOpen, currentUser]);
  
  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);
  
  // Filter results instantly (no API call, just filter cached emails)
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const { operators, keywords } = parseQuery(query);
    if (operators.length === 0 && keywords.length === 0) return [];
    return emails.filter(email => matchesQuery(email, operators, keywords));
  }, [emails, query]);
  
  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);
  
  // Get current index for navigation
  const currentEmailIndex = useMemo(() => {
    if (!selectedEmail) return -1;
    return results.findIndex(e => e.id === selectedEmail.id);
  }, [selectedEmail, results]);
  
  // Navigate to previous/next email
  const handlePrevious = () => {
    if (currentEmailIndex > 0) {
      handleEmailClick(results[currentEmailIndex - 1]);
    }
  };
  
  const handleNext = () => {
    if (currentEmailIndex < results.length - 1) {
      handleEmailClick(results[currentEmailIndex + 1]);
    }
  };
  
  // Fetch full email when selected
  const handleEmailClick = async (email: SearchableEmail) => {
    setSelectedEmail(email as FullEmail);
    setDetailLoading(true);
    
    try {
      const token = await currentUser?.getIdToken();
      const response = await fetch(
        `${API_URL}/api/emails/${email.source}/${email.id}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const fullEmail = await response.json();
        setSelectedEmail({
          ...email,
          body_html: fullEmail.body_html || fullEmail.bodyHtml,
          body_text: fullEmail.body_text || fullEmail.bodyText || fullEmail.body_plain,
          cc: fullEmail.cc || [],
          bcc: fullEmail.bcc || [],
          message_id: fullEmail.message_id,
          attachments: fullEmail.attachments || [],
        });
      }
    } catch (err) {
      console.error('Failed to fetch email details:', err);
    } finally {
      setDetailLoading(false);
    }
  };
  
  // Reply handler
  const handleReply = useCallback(() => {
    if (!selectedEmail) return;
    const email = convertToEmail(selectedEmail);
    setReplyEmail(email);
    setIsReplyOpen(true);
  }, [selectedEmail]);
  
  // Forward handler
  const handleForward = useCallback(() => {
    if (!selectedEmail) return;
    const email = convertToEmail(selectedEmail);
    setForwardEmail(email);
    setIsForwardOpen(true);
  }, [selectedEmail]);
  
  // Email sent handler - show undo toast (like Inbox)
  const handleEmailSent = useCallback((emailId: string, recipients: string[], emailData: UndoEmailData) => {
    console.log('📧 Email queued, showing undo toast:', emailId);
    setEmailUndoToast({
      show: true,
      emailId,
      recipients,
      emailData
    });
  }, []);
  
  // Called when user successfully undoes the email - store data (like Inbox)
  const handleEmailUndone = useCallback(() => {
    console.log('↩️ Email cancelled, storing data for modal');
    
    const emailData = emailUndoToast?.emailData;
    if (!emailData) return;
    
    // Store undo data - useEffect below will open the appropriate modal
    setUndoComposeData(emailData);
    
    // Also set up reply/forward state if needed (so modal has originalEmail)
    if (emailData.type === 'reply' && emailData.originalEmail) {
      setReplyEmail(emailData.originalEmail as Email);
    } else if (emailData.type === 'forward' && emailData.originalEmail) {
      setForwardEmail(emailData.originalEmail as Email);
    }
  }, [emailUndoToast]);
  
  // Open modal AFTER undoComposeData is set (fixes timing issue - like Inbox)
  useEffect(() => {
    if (undoComposeData) {
      console.log('📧 Opening modal with undo data, type:', undoComposeData.type);
      if (undoComposeData.type === 'reply') {
        setIsReplyOpen(true);
      } else if (undoComposeData.type === 'forward') {
        setIsForwardOpen(true);
      }
    }
  }, [undoComposeData]);
  
  // Close undo toast
  const handleCloseEmailUndoToast = useCallback(() => {
    setEmailUndoToast(null);
  }, []);
  
  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || isReplyOpen || isForwardOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedEmail) {
          setSelectedEmail(null);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowDown' && !selectedEmail) {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, Math.min(results.length - 1, 49)));
      } else if (e.key === 'ArrowUp' && !selectedEmail) {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex] && !selectedEmail) {
        e.preventDefault();
        handleEmailClick(results[selectedIndex]);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, selectedEmail, onClose, isReplyOpen, isForwardOpen]);
  
  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setSelectedEmail(null);
      setIsExpanded(false);
      setUndoComposeData(null);
    }
  }, [isOpen]);
  
  // Reset fetch flag when modal closes completely
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        hasFetchedRef.current = false;
      }, 60000); // Refresh cache after 1 minute
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  const showDetailPanel = selectedEmail !== null;
  
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Custom scrollbar styles */}
        <style>{`
          .search-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .search-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .search-scroll::-webkit-scrollbar-thumb {
            background: #3f3f46;
            border-radius: 3px;
          }
          .search-scroll::-webkit-scrollbar-thumb:hover {
            background: #52525b;
          }
        `}</style>
        
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        
        {/* Modal */}
        <div className={`relative bg-zinc-900 rounded-xl shadow-2xl border border-zinc-700/50 overflow-hidden flex flex-col transition-all duration-200 ${
          showDetailPanel 
            ? isExpanded 
              ? 'w-full h-full max-w-none rounded-none' 
              : 'w-full max-w-6xl h-[80vh]'
            : 'w-full max-w-2xl max-h-[80vh]'
        }`}>
          
          {/* Top Search Bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-700/50 bg-zinc-900 flex-shrink-0">
            <Search className="w-5 h-5 text-zinc-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search emails... (from:name, subject:text, has:attachment)"
              className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none text-base"
              autoComplete="off"
              spellCheck={false}
            />
            <button onClick={onClose} className="p-1.5 hover:bg-zinc-700/50 rounded">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
          
          {/* Content Area */}
          <div className={`flex flex-1 min-h-0 ${showDetailPanel ? 'divide-x divide-zinc-700/50' : ''}`}>
            
            {/* Left Panel - Results List */}
            <div className={`flex flex-col min-h-0 ${
              showDetailPanel 
                ? isExpanded ? 'w-[280px]' : 'w-[320px]' 
                : 'w-full'
            }`}>
              <div 
                className="search-scroll flex-1 overflow-y-auto"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}
              >
                {error ? (
                  <div className="py-8 text-center text-red-400">{error}</div>
                ) : !query.trim() ? (
                  <div className="py-8 px-4 text-center text-zinc-500">
                    <p className="mb-3">Start typing to search</p>
                    <div className="text-xs space-y-1 text-zinc-600">
                      <p><span className="text-zinc-500">from:</span>sender • <span className="text-zinc-500">subject:</span>text</p>
                      <p><span className="text-zinc-500">has:</span>attachment • <span className="text-zinc-500">in:</span>inbox/sent</p>
                    </div>
                  </div>
                ) : results.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500">
                    {loading ? 'Searching...' : `No emails found for "${query}"`}
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800">
                    {results.slice(0, 50).map((email, index) => (
                      <div
                        key={email.id}
                        onClick={() => handleEmailClick(email)}
                        className={`px-3 py-2.5 cursor-pointer transition-colors ${
                          selectedEmail?.id === email.id 
                            ? 'bg-zinc-800' 
                            : index === selectedIndex 
                              ? 'bg-zinc-800/50' 
                              : 'hover:bg-zinc-800/30'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-1.5 h-1.5 mt-2 rounded-full flex-shrink-0 ${
                            email.is_read ? 'bg-transparent' : 'bg-[#8FA8A3]'
                          }`} />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`truncate text-sm ${email.is_read ? 'text-zinc-300' : 'text-white font-medium'}`}>
                                {email.sender || email.sender_email}
                              </span>
                              <span className="text-xs text-zinc-500 flex-shrink-0">
                                {formatDate(email.date)}
                              </span>
                            </div>
                            
                            <div className={`truncate text-sm mt-0.5 ${email.is_read ? 'text-zinc-400' : 'text-zinc-200'}`}>
                              {email.subject || '(no subject)'}
                            </div>
                            
                            {!showDetailPanel && (
                              <div className="truncate text-xs text-zinc-500 mt-0.5">
                                {email.snippet}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
                                email.source === 'inbox' ? 'bg-blue-500/10 text-blue-400' :
                                email.source === 'sent' ? 'bg-green-500/10 text-green-400' :
                                email.source === 'done' ? 'bg-zinc-500/10 text-zinc-400' :
                                'bg-red-500/10 text-red-400'
                              }`}>
                                <SourceIcon source={email.source} />
                                {email.source}
                              </span>
                              {email.has_attachment && (
                                <Paperclip className="w-3 h-3 text-zinc-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="px-3 py-2 border-t border-zinc-700/50 text-xs text-zinc-500 flex-shrink-0">
                {results.length > 0 ? `${results.length} results` : ''}
              </div>
            </div>
            
            {/* Right Panel - Email Detail */}
            {showDetailPanel && (
              <div className="flex-1 flex flex-col min-h-0 bg-[#1a1a1a]">
                {/* Detail Header Bar */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700/50 bg-zinc-900/50 flex-shrink-0">
                  <h2 className="text-base font-medium text-white truncate flex-1 mr-4">
                    {selectedEmail.subject || '(no subject)'}
                  </h2>
                  
                  <div className="flex items-center gap-1">
                    {/* Navigation */}
                    <button 
                      onClick={handlePrevious}
                      disabled={currentEmailIndex <= 0}
                      className="p-1.5 hover:bg-zinc-700/50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Previous"
                    >
                      <ChevronLeft className="w-4 h-4 text-zinc-400" />
                    </button>
                    <button 
                      onClick={handleNext}
                      disabled={currentEmailIndex >= results.length - 1}
                      className="p-1.5 hover:bg-zinc-700/50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Next"
                    >
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </button>
                    
                    {/* Expand/Collapse */}
                    <button 
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="p-1.5 hover:bg-zinc-700/50 rounded"
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? (
                        <Minimize2 className="w-4 h-4 text-zinc-400" />
                      ) : (
                        <Maximize2 className="w-4 h-4 text-zinc-400" />
                      )}
                    </button>
                    
                    {/* Close Detail */}
                    <button 
                      onClick={() => setSelectedEmail(null)}
                      className="p-1.5 hover:bg-zinc-700/50 rounded"
                      title="Close"
                    >
                      <X className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>
                </div>
                
                {/* Email Content */}
                {detailLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-[#8FA8A3] animate-spin" />
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto search-scroll px-6 pb-6 pt-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
                    <div className="max-w-[600px] mx-auto">
                      <SearchEmailCard 
                        email={selectedEmail as SearchEmailData}
                        onReply={handleReply}
                        onForward={handleForward}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Reply Modal */}
      {isReplyOpen && replyEmail && (
        <ReplyModal
          key={undoComposeData?.type === 'reply' ? 'undo' : 'normal'}
          isOpen={isReplyOpen}
          onClose={() => {
            setIsReplyOpen(false);
            setReplyEmail(null);
            setUndoComposeData(null);
          }}
          mode="reply"
          originalEmail={replyEmail}
          threadId={selectedEmail?.thread_id || undoComposeData?.threadId || ''}
          threadSubject={selectedEmail?.subject || ''}
          messageId={replyEmail.message_id || undoComposeData?.messageId}
          userEmail={currentUser?.email || ''}
          onEmailSent={handleEmailSent}
          // Undo restore: pass initial values if available
          initialTo={undoComposeData?.type === 'reply' ? undoComposeData.to : undefined}
          initialCc={undoComposeData?.type === 'reply' ? undoComposeData.cc : undefined}
          initialBody={undoComposeData?.type === 'reply' ? undoComposeData.body_html : undefined}
          initialAttachments={undoComposeData?.type === 'reply' ? undoComposeData.attachments as AttachedFile[] : undefined}
        />
      )}
      
      {/* Forward Modal */}
      {isForwardOpen && forwardEmail && (
        <ForwardModal
          key={undoComposeData?.type === 'forward' ? 'undo' : 'normal'}
          isOpen={isForwardOpen}
          onClose={() => {
            setIsForwardOpen(false);
            setForwardEmail(null);
            setUndoComposeData(null);
          }}
          originalEmail={forwardEmail}
          threadId={selectedEmail?.thread_id || undoComposeData?.threadId || ''}
          threadSubject={selectedEmail?.subject || ''}
          userEmail={currentUser?.email || ''}
          onEmailSent={handleEmailSent}
          // Undo restore: pass initial values if available
          initialTo={undoComposeData?.type === 'forward' ? undoComposeData.to : undefined}
          initialCc={undoComposeData?.type === 'forward' ? undoComposeData.cc : undefined}
          initialBody={undoComposeData?.type === 'forward' ? undoComposeData.body_html : undefined}
          initialAttachments={undoComposeData?.type === 'forward' ? undoComposeData.attachments as AttachedFile[] : undefined}
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
    </>
  );
}