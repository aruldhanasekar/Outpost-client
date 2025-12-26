import { useRef, useEffect, useState, useMemo } from 'react';
import { X, Check, Trash2, Loader2, Reply, Forward, Paperclip, Download, ChevronDown } from 'lucide-react';
import { Thread } from '@/hooks/useThreads';
import { Email } from './types';
import { getTrackingByMessageId, TrackingStats } from '@/services/trackingApi';
import { formatFileSize, formatRelativeTime } from '@/utils/formatters';
import { stripQuotedReply } from '@/utils/emailHelpers';
import { 
  updateThreadCategory, 
  checkSenderRule, 
  createTriageRule, 
  deleteTriageRuleBySender 
} from '@/services/emailApi';
import OutpostLogo from '@/assets/Outpost.png';



interface TrackingStatusProps {
  messageId: string;
  getAuthToken?: () => Promise<string>;
}

function TrackingStatus({ messageId, getAuthToken }: TrackingStatusProps) {
  const [tracking, setTracking] = useState<TrackingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    if (!messageId) {
      setLoading(false);
      return;
    }
    
    const fetchTracking = async () => {
      try {
        const data = await getTrackingByMessageId(messageId);
        setTracking(data);
        // Small delay then fade in
        setTimeout(() => setVisible(true), 50);
      } catch (err) {
        console.error('Failed to fetch tracking:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTracking();
  }, [messageId]);
  
  // Always render the container to reserve space, just hide content
  const isOpened = tracking?.opened;
  const firstOpenedAt = tracking?.first_opened_at;
  const lastOpenedAt = tracking?.last_opened_at;
  
  return (
    <div className="flex justify-end mt-1.5 pr-1 h-5">
      <div className={`transition-opacity duration-200 ease-in-out ${visible && tracking ? 'opacity-100' : 'opacity-0'}`}>
        {tracking && (
          isOpened ? (
            // Seen state with hover tooltip
            <div className="relative group/tracking">
              <span className="text-xs text-gray-500 cursor-default">Seen</span>
              {/* Tooltip on hover */}
              <div className="absolute right-0 bottom-full mb-1.5 px-3 py-2 bg-zinc-900 text-white text-xs rounded-lg opacity-0 group-hover/tracking:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[9999] shadow-lg">
                <div className="flex flex-col gap-1">
                  <span>Opened {formatRelativeTime(firstOpenedAt)}</span>
                  {lastOpenedAt && lastOpenedAt !== firstOpenedAt && (
                    <span className="text-gray-400">Last opened {formatRelativeTime(lastOpenedAt)}</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Sent state with checkmark
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span>Sent</span>
              <Check className="w-3 h-3" />
            </div>
          )
        )}
      </div>
    </div>
  );
}

// Expand icon SVG component
const ExpandIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
    <path d="M408 64L552 64C565.3 64 576 74.7 576 88L576 232C576 241.7 570.2 250.5 561.2 254.2C552.2 257.9 541.9 255.9 535 249L496 210L409 297C399.6 306.4 384.4 306.4 375.1 297L343.1 265C333.7 255.6 333.7 240.4 343.1 231.1L430.1 144.1L391.1 105.1C384.2 98.2 382.2 87.9 385.9 78.9C389.6 69.9 398.3 64 408 64zM232 576L88 576C74.7 576 64 565.3 64 552L64 408C64 398.3 69.8 389.5 78.8 385.8C87.8 382.1 98.1 384.2 105 391L144 430L231 343C240.4 333.6 255.6 333.6 264.9 343L296.9 375C306.3 384.4 306.3 399.6 296.9 408.9L209.9 495.9L248.9 534.9C255.8 541.8 257.8 552.1 254.1 561.1C250.4 570.1 241.7 576 232 576z"/>
  </svg>
);

// Minimize icon SVG component
const MinimizeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
    <path d="M503.5 71C512.9 61.6 528.1 61.6 537.4 71L569.4 103C578.8 112.4 578.8 127.6 569.4 136.9L482.4 223.9L521.4 262.9C528.3 269.8 530.3 280.1 526.6 289.1C522.9 298.1 514.2 304 504.5 304L360.5 304C347.2 304 336.5 293.3 336.5 280L336.5 136C336.5 126.3 342.3 117.5 351.3 113.8C360.3 110.1 370.6 112.1 377.5 119L416.5 158L503.5 71zM136.5 336L280.5 336C293.8 336 304.5 346.7 304.5 360L304.5 504C304.5 513.7 298.7 522.5 289.7 526.2C280.7 529.9 270.4 527.9 263.5 521L224.5 482L137.5 569C128.1 578.4 112.9 578.4 103.6 569L71.6 537C62.2 527.6 62.2 512.4 71.6 503.1L158.6 416.1L119.6 377.1C112.7 370.2 110.7 359.9 114.4 350.9C118.1 341.9 126.8 336 136.5 336z"/>
  </svg>
);

// Navigation arrows
const LeftArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
    <path d="M201.4 297.4C188.9 309.9 188.9 330.2 201.4 342.7L361.4 502.7C373.9 515.2 394.2 515.2 406.7 502.7C419.2 490.2 419.2 469.9 406.7 457.4L269.3 320L406.6 182.6C419.1 170.1 419.1 149.8 406.6 137.3C394.1 124.8 373.8 124.8 361.3 137.3L201.3 297.3z"/>
  </svg>
);

const RightArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
    <path d="M439.1 297.4C451.6 309.9 451.6 330.2 439.1 342.7L279.1 502.7C266.6 515.2 246.3 515.2 233.8 502.7C221.3 490.2 221.3 469.9 233.8 457.4L371.2 320L233.9 182.6C221.4 170.1 221.4 149.8 233.9 137.3C246.4 124.8 266.7 124.8 279.2 137.3L439.2 297.3z"/>
  </svg>
);

// ======================================================
// CATEGORY DROPDOWN COMPONENT
// ======================================================
interface CategoryDropdownProps {
  thread: Thread;
  emails: Email[];
  userEmail: string;
  onCategoryChange?: (threadId: string, newCategory: string) => void;
}

interface SenderRuleState {
  [senderEmail: string]: {
    hasRule: boolean;
    loading: boolean;
    category?: string;
  };
}

function CategoryDropdownMenu({ thread, emails, userEmail, onCategoryChange }: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    thread.user_category || thread.category || 'OTHERS'
  );
  const [updating, setUpdating] = useState(false);
  const [senderRules, setSenderRules] = useState<SenderRuleState>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Get unique senders from thread emails (excluding user's own email)
  const uniqueSenders = useMemo(() => {
    const senders = new Map<string, string>(); // email -> name
    emails.forEach(email => {
      if (email.senderEmail && email.senderEmail.toLowerCase() !== userEmail.toLowerCase()) {
        senders.set(email.senderEmail.toLowerCase(), email.sender || email.senderEmail);
      }
    });
    return Array.from(senders.entries()).map(([email, name]) => ({ email, name }));
  }, [emails, userEmail]);
  
  // Check sender rules when dropdown opens
  useEffect(() => {
    if (isOpen && uniqueSenders.length > 0) {
      uniqueSenders.forEach(async ({ email }) => {
        if (senderRules[email] !== undefined) return; // Already checked
        
        setSenderRules(prev => ({
          ...prev,
          [email]: { hasRule: false, loading: true }
        }));
        
        try {
          const result = await checkSenderRule(email);
          setSenderRules(prev => ({
            ...prev,
            [email]: { 
              hasRule: result.exists, 
              loading: false,
              category: result.rule?.category
            }
          }));
        } catch (err) {
          console.error('Error checking sender rule:', err);
          setSenderRules(prev => ({
            ...prev,
            [email]: { hasRule: false, loading: false }
          }));
        }
      });
    }
  }, [isOpen, uniqueSenders, senderRules]);
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  
  // Handle category change
  const handleCategorySelect = async (category: string) => {
    if (category === selectedCategory || updating) return;
    
    setUpdating(true);
    const previousCategory = selectedCategory;
    setSelectedCategory(category);
    
    try {
      // Update thread document directly using thread_id
      await updateThreadCategory(thread.thread_id, category);
      
      // Notify parent
      if (onCategoryChange) {
        onCategoryChange(thread.thread_id, category);
      }
      
      setIsOpen(false);
    } catch (err) {
      console.error('Error updating category:', err);
      setSelectedCategory(previousCategory);
    } finally {
      setUpdating(false);
    }
  };
  
  // Handle sender rule toggle
  const handleSenderRuleToggle = async (senderEmail: string, senderName: string, currentlyHasRule: boolean) => {
    setSenderRules(prev => ({
      ...prev,
      [senderEmail]: { ...prev[senderEmail], loading: true }
    }));
    
    try {
      if (currentlyHasRule) {
        // Delete rule
        await deleteTriageRuleBySender(senderEmail);
        setSenderRules(prev => ({
          ...prev,
          [senderEmail]: { hasRule: false, loading: false }
        }));
      } else {
        // Create rule with current category
        await createTriageRule({
          sender_email: senderEmail,
          sender_name: senderName,
          category: selectedCategory
        });
        setSenderRules(prev => ({
          ...prev,
          [senderEmail]: { hasRule: true, loading: false, category: selectedCategory }
        }));
      }
    } catch (err) {
      console.error('Error toggling sender rule:', err);
      setSenderRules(prev => ({
        ...prev,
        [senderEmail]: { ...prev[senderEmail], loading: false }
      }));
    }
  };
  
  const categories = [
    { id: 'URGENT', label: 'Urgent' },
    { id: 'IMPORTANT', label: 'Important' },
    { id: 'OTHERS', label: 'Others' }
  ];

  return (
    <div ref={dropdownRef} className="relative group">
      {/* Logo trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <img src={OutpostLogo} alt="Outpost" className="w-5 h-5" />
      </button>
      
      {/* Custom tooltip - hide when dropdown is open */}
      {!isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          Change category
        </div>
      )}
      
      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 z-50 overflow-hidden">
          {/* Category selection */}
          <div className="p-3 border-b border-zinc-700">
            <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2">Category</p>
            <div className="space-y-1">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  disabled={updating}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                    selectedCategory === cat.id 
                      ? 'bg-zinc-700' 
                      : 'hover:bg-zinc-700/50'
                  } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="text-sm text-zinc-200">{cat.label}</span>
                  {selectedCategory === cat.id && (
                    <Check className="w-4 h-4 text-zinc-300" />
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Sender rules */}
          {uniqueSenders.length > 0 && (
            <div className="p-3">
              <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2">
                Always triage emails from
              </p>
              <div className="space-y-2">
                {uniqueSenders.map(({ email, name }) => {
                  const ruleState = senderRules[email] || { hasRule: false, loading: false };
                  
                  return (
                    <div key={email} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-sm text-zinc-200 truncate">{name}</p>
                        <p className="text-xs text-zinc-500 truncate">{email}</p>
                      </div>
                      <button
                        onClick={() => handleSenderRuleToggle(email, name, ruleState.hasRule)}
                        disabled={ruleState.loading}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          ruleState.loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        } ${ruleState.hasRule ? 'bg-[#8FA8A3]' : 'bg-zinc-600'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          ruleState.hasRule ? 'translate-x-5' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                  );
                })}
              </div>
              {Object.values(senderRules).some(r => r.hasRule) && (
                <p className="text-xs text-zinc-500 mt-2 italic">
                  New emails from toggled senders will be categorized as {selectedCategory}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper: Check if URL is a Composio attachment URL (needs auth)
const isComposioAttachmentUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  return url.includes('/api/composio/attachments/');
};

type ThreadMode = 'promise' | 'awaiting' | 'inbox';

interface ThreadDetailProps {
  thread: Thread;
  emails: Email[];
  loading: boolean;
  userEmail: string;
  onClose: () => void;
  onMarkDone?: () => void;
  onDelete?: () => void;
  onExpand?: () => void;
  isExpanded?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  mode?: ThreadMode;
  getAuthToken?: () => Promise<string>; // For tracking API calls
  onReply?: (email: Email) => void;      // v3.0: Reply handler
  onReplyAll?: (email: Email) => void;   // v4.0: Reply All handler
  onForward?: (email: Email) => void;    // v3.0: Forward handler
  onCategoryChange?: (threadId: string, newCategory: string) => void; // v5.0: Category override
}

// Collapsed email row component
interface CollapsedEmailCardProps {
  email: Email;
  userEmail: string;
  onClick: () => void;
}

function CollapsedEmailCard({ email, userEmail, onClick }: CollapsedEmailCardProps) {
  const isUserSender = email.senderEmail?.toLowerCase() === userEmail?.toLowerCase();
  const displayName = isUserSender ? 'You' : email.sender;
  const hasAttachment = email.hasAttachment || (email.attachments && email.attachments.length > 0);
  
  return (
    <div 
      onClick={onClick}
      className="mb-2 bg-white rounded-lg px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-800 w-28 truncate flex-shrink-0">
          {displayName}
        </span>
        <span className="text-sm text-gray-500 flex-1 truncate">
          {email.preview || email.subject}
        </span>
        {hasAttachment && (
          <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        )}
        <span className="text-xs text-gray-400 flex-shrink-0">
          {email.time}
        </span>
      </div>
    </div>
  );
}

// Animated email item with smooth expand/collapse
interface AnimatedEmailItemProps {
  email: Email;
  isExpanded: boolean;
  isLatest: boolean;
  userEmail: string;
  onToggle: () => void;
  getAuthToken?: () => Promise<string>;
  onReply?: (email: Email) => void;
  onForward?: (email: Email) => void;
}

function AnimatedEmailItem({ 
  email, 
  isExpanded, 
  isLatest, 
  userEmail, 
  onToggle,
  getAuthToken,
  onReply,
  onForward
}: AnimatedEmailItemProps) {
  const isUserSender = email.senderEmail?.toLowerCase() === userEmail?.toLowerCase();
  const displayName = isUserSender ? 'You' : email.sender;
  const hasAttachment = email.hasAttachment || (email.attachments && email.attachments.length > 0);

  return (
    <div 
      id={`email-${email.id}`}
      className="mb-2"
    >
      {isExpanded ? (
        <div 
          onClick={!isLatest ? onToggle : undefined}
          className={!isLatest ? 'cursor-pointer' : ''}
        >
          <EmailCard 
            email={email} 
            userEmail={userEmail}
            getAuthToken={getAuthToken}
            onReply={onReply}
            onForward={onForward}
          />
        </div>
      ) : (
        <div 
          onClick={onToggle}
          className="bg-white rounded-lg px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-800 w-28 truncate flex-shrink-0">
              {displayName}
            </span>
            <span className="text-sm text-gray-500 flex-1 truncate">
              {email.preview || email.subject}
            </span>
            {hasAttachment && (
              <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            )}
            <span className="text-xs text-gray-400 flex-shrink-0">
              {email.time}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Individual email card within thread
interface EmailCardProps {
  email: Email;
  userEmail: string;
  getAuthToken?: () => Promise<string>;
  onReply?: (email: Email) => void;
  onForward?: (email: Email) => void;
}

function EmailCard({ email, userEmail, getAuthToken, onReply, onForward }: EmailCardProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(60);
  
  const isHtml = /<[a-z][\s\S]*>/i.test(email.body);
  const cleanBody = stripQuotedReply(email.body, isHtml);
  
  const isUserSender = email.senderEmail?.toLowerCase() === userEmail?.toLowerCase();
  const displayName = isUserSender ? 'You' : email.sender;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { box-sizing: border-box; -ms-overflow-style: none; scrollbar-width: none; }
          *::-webkit-scrollbar { display: none; }
          html, body {
            margin: 0;
            padding: 0;
            height: auto !important;
            overflow-x: hidden;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #1a1a1a;
            background: transparent;
            padding: 16px;
          }
          img { max-width: 100%; height: auto; }
          a { color: #2563eb; }
          pre { white-space: pre-wrap; word-wrap: break-word; }
        </style>
      </head>
      <body>${cleanBody}</body>
    </html>
  `;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !isHtml) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'emailHeight' && event.data.height > 0) {
        setIframeHeight(event.data.height + 10);
      }
    };

    const updateHeight = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc && doc.body) {
          const height = doc.body.scrollHeight;
          if (height > 0) setIframeHeight(height + 10);
        }
      } catch {
        // Cross-origin error
      }
    };

    window.addEventListener('message', handleMessage);
    iframe.addEventListener('load', updateHeight);
    // Single height check after load
    const t1 = setTimeout(updateHeight, 100);

    return () => {
      window.removeEventListener('message', handleMessage);
      iframe.removeEventListener('load', updateHeight);
      clearTimeout(t1);
    };
  }, [cleanBody, isHtml]);

  // v3.0: Handle reply click
  const handleReplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onReply) {
      onReply(email);
    } else {
      console.log('Reply to:', email.id, email.senderEmail, email.subject);
    }
  };

  // v3.0: Handle forward click
  const handleForwardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onForward) {
      onForward(email);
    } else {
      console.log('Forward:', email.id, email.subject);
    }
  };

  // v4.0: Handle Composio attachment download (needs auth)
  const handleComposioDownload = async (e: React.MouseEvent, attachment: { url?: string; filename: string }) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!attachment.url) return;
    
    try {
      const token = getAuthToken ? await getAuthToken() : null;
      if (!token) {
        console.error('No auth token for Composio attachment download');
        return;
      }
      
      const response = await fetch(attachment.url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = attachment.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Composio attachment download error:', error);
    }
  };

  return (
    <div className="mb-3 last:mb-0">
    <div className="group bg-white rounded-lg shadow-sm">
      {/* Email Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800">{displayName}</span>
        </div>
        
        {/* Right side: Reply/Forward icons (hover) + Time */}
        <div className="flex items-center gap-2">
          {/* Reply/Forward icons - show on hover */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Reply button with tooltip */}
            <div className="relative group/btn">
              <button
                onClick={handleReplyClick}
                className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-gray-600"
              >
                <Reply className="w-4 h-4" />
              </button>
              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-1 bg-zinc-900 text-white text-xs rounded-md opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[9999] shadow-lg">
                Reply
              </span>
            </div>
            {/* Forward button with tooltip */}
            <div className="relative group/btn">
              <button
                onClick={handleForwardClick}
                className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-gray-600"
              >
                <Forward className="w-4 h-4" />
              </button>
              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-1 bg-zinc-900 text-white text-xs rounded-md opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[9999] shadow-lg">
                Forward
              </span>
            </div>
          </div>
          
          <span className="text-xs text-gray-400">{email.time}</span>
        </div>
      </div>
      
      {/* Email Body */}
      <div className="px-5 py-4">
        {isHtml ? (
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            sandbox="allow-same-origin"
            className="w-full border-0 transition-[height] duration-200 ease-out"
            style={{ height: `${iframeHeight}px`, background: 'transparent' }}
            title="Email content"
          />
        ) : (
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {cleanBody}
          </div>
        )}
      </div>
      
      {/* Attachments Section */}
      {email.hasAttachment && (
        <div className="px-5 pb-4">
          {/* Image Attachments - Grid Preview (Direct Auth only, not Composio) */}
          {email.attachments && email.attachments.filter(a => a.content_type?.startsWith('image/') && !isComposioAttachmentUrl(a.url)).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {email.attachments
                .filter(a => a.content_type?.startsWith('image/') && !isComposioAttachmentUrl(a.url))
                .map((attachment, idx) => (
                  <a
                    key={attachment.id || `img-${idx}`}
                    href={attachment.url || '#'}
                    download={attachment.filename}
                    className="relative group rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity"
                    title={`${attachment.filename} (${formatFileSize(attachment.size)}) - Click to download`}
                  >
                    <img
                      src={attachment.url}
                      alt={attachment.filename}
                      className="max-h-48 max-w-64 object-cover rounded-lg"
                      loading="lazy"
                    />
                    {/* Download overlay on hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Download className="w-6 h-6 text-white" />
                    </div>
                  </a>
                ))}
            </div>
          )}
          
          {/* Non-Image Attachments - Direct Auth (Link Style, unchanged) */}
          {email.attachments && email.attachments.filter(a => !a.content_type?.startsWith('image/') && !isComposioAttachmentUrl(a.url)).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {email.attachments
                .filter(a => !a.content_type?.startsWith('image/') && !isComposioAttachmentUrl(a.url))
                .map((attachment, idx) => (
                  <a
                    key={attachment.id || `file-${idx}`}
                    href={attachment.url || '#'}
                    download={attachment.filename}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm text-gray-700 group"
                    title={`${attachment.filename} (${formatFileSize(attachment.size)})`}
                  >
                    <Paperclip className="w-4 h-4 text-gray-500" />
                    <span className="max-w-[180px] truncate">{attachment.filename}</span>
                    <span className="text-gray-400 text-xs">{formatFileSize(attachment.size)}</span>
                    {attachment.url && (
                      <Download className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </a>
                ))}
            </div>
          )}
          
          {/* Composio Attachments - All types (needs auth, no image preview) */}
          {email.attachments && email.attachments.filter(a => isComposioAttachmentUrl(a.url)).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {email.attachments
                .filter(a => isComposioAttachmentUrl(a.url))
                .map((attachment, idx) => (
                  <button
                    key={attachment.id || `composio-${idx}`}
                    onClick={(e) => handleComposioDownload(e, attachment)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm text-gray-700 group cursor-pointer"
                    title={`${attachment.filename} (${formatFileSize(attachment.size)}) - Click to download`}
                  >
                    <Paperclip className="w-4 h-4 text-gray-500" />
                    <span className="max-w-[180px] truncate">{attachment.filename}</span>
                    <span className="text-gray-400 text-xs">{formatFileSize(attachment.size)}</span>
                    <Download className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
            </div>
          )}
          
          {/* Fallback when no attachment data */}
          {(!email.attachments || email.attachments.length === 0) && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-500">
              <Paperclip className="w-4 h-4" />
              <span>Attachment</span>
            </div>
          )}
        </div>
      )}
    </div>
    
    {/* v3.2: Instagram-style tracking status - below card, right-aligned */}
    {isUserSender && email.message_id && (
      <TrackingStatus messageId={email.message_id} getAuthToken={getAuthToken} />
    )}
  </div>
  );
}

export function ThreadDetail({ 
  thread, 
  emails, 
  loading, 
  userEmail, 
  onClose, 
  onMarkDone, 
  onDelete,
  onExpand,
  isExpanded = false,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  mode = 'inbox',
  getAuthToken,
  onReply,
  onReplyAll,
  onForward,
  onCategoryChange
}: ThreadDetailProps) {
  // State for tracking which emails are expanded (by email id)
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
  const emailListRef = useRef<HTMLDivElement>(null);
  
  // Detect OS for keyboard shortcut display
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  // Initialize: Latest email always expanded
  useEffect(() => {
    if (emails.length > 0) {
      const latestEmailId = emails[emails.length - 1].id;
      setExpandedEmails(new Set([latestEmailId]));
    }
  }, [emails]);
  
  // Get the latest email for keyboard shortcuts
  const latestEmail = emails.length > 0 ? emails[emails.length - 1] : null;
  
  // Handle toggling email expanded/collapsed state
  const handleToggleEmail = (emailId: string) => {
    // Don't allow collapsing the latest email
    if (isLatestEmail(emailId)) return;
    
    setExpandedEmails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        // Collapse it
        newSet.delete(emailId);
      } else {
        // Expand it
        newSet.add(emailId);
        // Scroll to the expanded email after a short delay
        setTimeout(() => {
          const emailElement = document.getElementById(`email-${emailId}`);
          if (emailElement && emailListRef.current) {
            emailElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
      return newSet;
    });
  };
  
  // Check if an email is the latest
  const isLatestEmail = (emailId: string) => {
    return emails.length > 0 && emails[emails.length - 1].id === emailId;
  };
  
  // Ref to track last key pressed for R+A combo
  const lastKeyRef = useRef<string | null>(null);
  
  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // R+A for Reply All (check if A is pressed while R was recently pressed)
      if (e.key.toLowerCase() === 'a' && lastKeyRef.current === 'r') {
        e.preventDefault();
        if (latestEmail && onReplyAll) {
          onReplyAll(latestEmail);
        }
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
            if (latestEmail && onReply) {
              onReply(latestEmail);
            }
            lastKeyRef.current = null;
          }
        }, 300);
        return;
      }
      
      // F for Forward
      if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (latestEmail && onForward) {
          onForward(latestEmail);
        }
        return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [latestEmail, onReply, onReplyAll, onForward]);
  
  // Determine which summary to show based on thread properties (not current category)
  const summaryText = thread.has_awaiting && thread.ui_summary_awaiting
    ? thread.ui_summary_awaiting
    : thread.has_promise && thread.ui_summary_promise
      ? thread.ui_summary_promise
      : null;
  
  const summaryLabel = thread.has_awaiting && thread.ui_summary_awaiting
    ? 'Waiting For'
    : thread.has_promise && thread.ui_summary_promise
      ? 'Promise Summary'
      : null;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <h2 className="text-lg font-medium text-white truncate pr-4" style={{ fontFamily: "'Manrope', sans-serif" }}>
          {thread.gmail_subject}
        </h2>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Category Dropdown */}
          {mode === 'inbox' && (
            <CategoryDropdownMenu
              thread={thread}
              emails={emails}
              userEmail={userEmail}
              onCategoryChange={onCategoryChange}
            />
          )}
          
          {/* Navigation Arrows */}
          {(onPrevious || onNext) && (
            <>
              <button 
                onClick={onPrevious}
                disabled={!hasPrevious}
                className={`p-2 rounded-lg transition-colors ${
                  hasPrevious 
                    ? 'hover:bg-gray-100 text-gray-500 hover:text-black cursor-pointer' 
                    : 'text-gray-400 cursor-not-allowed'
                }`}
                title="Previous thread"
              >
                <LeftArrowIcon />
              </button>
              <button 
                onClick={onNext}
                disabled={!hasNext}
                className={`p-2 rounded-lg transition-colors ${
                  hasNext 
                    ? 'hover:bg-gray-100 text-gray-500 hover:text-black cursor-pointer' 
                    : 'text-gray-400 cursor-not-allowed'
                }`}
                title="Next thread"
              >
                <RightArrowIcon />
              </button>
            </>
          )}
          
          {/* Expand/Minimize Button */}
          {onExpand && (
            <button 
              onClick={onExpand}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-black"
              title={isExpanded ? "Minimize" : "Expand"}
            >
              {isExpanded ? <MinimizeIcon /> : <ExpandIcon />}
            </button>
          )}
          
          {/* Mark as Done Button */}
          {onMarkDone && (
            <button 
              onClick={onMarkDone}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-black"
              title="Mark as done"
            >
              <Check className="w-5 h-5" />
            </button>
          )}
          
          {/* Delete Button */}
          {onDelete && (
            <button 
              onClick={onDelete}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-black"
              title="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-black"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary Banner - Only for promise/awaiting modes */}
      {summaryText && summaryLabel && (
        <div className="mx-6 mb-4 px-4 py-3 bg-white rounded-lg border border-gray-200">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">{summaryLabel}</p>
          <p className="text-sm text-black italic">
            "{summaryText}"
          </p>
        </div>
      )}

      {/* Email List */}
      <div ref={emailListRef} className="flex-1 overflow-y-auto hide-scrollbar px-6 pb-6">
        <div className="max-w-[600px] mx-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500 text-sm">No emails found</p>
            </div>
          ) : (
            emails.map((email) => {
              const isExpanded = expandedEmails.has(email.id) || isLatestEmail(email.id);
              const isLatest = isLatestEmail(email.id);
              
              return (
                <AnimatedEmailItem
                  key={email.id}
                  email={email}
                  isExpanded={isExpanded}
                  isLatest={isLatest}
                  userEmail={userEmail}
                  onToggle={() => handleToggleEmail(email.id)}
                  getAuthToken={getAuthToken}
                  onReply={onReply}
                  onForward={onForward}
                />
              );
            })
          )}
        </div>
      </div>
    </>
  );
}