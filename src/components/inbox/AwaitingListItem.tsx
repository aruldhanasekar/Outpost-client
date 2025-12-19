// AwaitingListItem.tsx - Individual awaiting item in list
// v2.1: Use last_email_sender for display, add unread indicator, add checkbox

import { Thread, Commitment, extractNameFromEmail } from './promiseTypes';

interface AwaitingListItemProps {
  thread: Thread;
  isSelected: boolean;
  onClick: () => void;
  // v2.1: Checkbox support
  isChecked?: boolean;
  onCheckChange?: (checked: boolean) => void;
}

// Helper: Get primary AWAITING commitment from thread
function getPrimaryAwaiting(thread: Thread): Commitment | null {
  if (!thread.commitments || thread.commitments.length === 0) return null;
  
  // Find first pending awaiting
  const pending = thread.commitments.find(
    c => c.status === 'pending' && c.type === 'AWAITING'
  );
  
  // If no pending awaiting, find any awaiting
  if (!pending) {
    return thread.commitments.find(c => c.type === 'AWAITING') || null;
  }
  
  return pending;
}

// Helper: Get display name with proper fallback
function getDisplayName(thread: Thread): string {
  // Priority 1: Use last_email_sender if available
  if (thread.last_email_sender && thread.last_email_sender.trim()) {
    return thread.last_email_sender;
  }
  
  // Priority 2: Extract from commitment who_owes (person we're waiting on)
  const commitment = getPrimaryAwaiting(thread);
  if (commitment?.who_owes) {
    return extractNameFromEmail(commitment.who_owes);
  }
  
  // Priority 3: Extract from participants
  if (thread.participants && thread.participants.length > 0) {
    const firstParticipant = thread.participants[0];
    const extracted = extractNameFromEmail(firstParticipant);
    // Capitalize first letter
    return extracted.charAt(0).toUpperCase() + extracted.slice(1);
  }
  
  return 'Someone';
}

// Helper: Calculate waiting duration text
function getWaitingText(commitment: Commitment | null, thread: Thread): string {
  // If there's a deadline, show deadline status
  if (commitment?.deadline) {
    const deadlineDate = new Date(commitment.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      const overdue = Math.abs(diffDays);
      return overdue === 1 ? '1 day overdue' : `${overdue} days overdue`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return '1 day left';
    } else {
      return `${diffDays} days left`;
    }
  }
  
  // No deadline - show how long we've been waiting
  const createdAt = commitment?.created_at || thread.created_at;
  if (createdAt) {
    const startDate = new Date(createdAt);
    const today = new Date();
    const diffTime = today.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Since today';
    } else if (diffDays === 1) {
      return 'Waiting 1 day';
    } else if (diffDays < 7) {
      return `Waiting ${diffDays} days`;
    } else if (diffDays < 14) {
      return 'Waiting 1 week';
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `Waiting ${weeks} weeks`;
    } else {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? 'Waiting 1 month' : `Waiting ${months} months`;
    }
  }
  
  return 'No deadline';
}

export function AwaitingListItem({ thread, isSelected, onClick, isChecked = false, onCheckChange }: AwaitingListItemProps) {
  const commitment = getPrimaryAwaiting(thread);
  const displayName = getDisplayName(thread);
  const waitingText = getWaitingText(commitment, thread);
  const isUnread = thread.is_read === false;
  
  // Check if overdue
  const isOverdue = waitingText.includes('overdue');

  // Handle checkbox click without triggering row click
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onCheckChange?.(e.target.checked);
  };

  return (
    <div
      onClick={onClick}
      className={`
        group cursor-pointer transition-all duration-150 relative
        ${isChecked 
          ? 'bg-[#f7ac5c]/10' 
          : isSelected 
            ? 'bg-zinc-700/40' 
            : 'hover:bg-zinc-700/20 hover:shadow-[0_2px_8px_rgba(0,0,0,0.4)] hover:z-10 hover:scale-[1.01]'
        }
      `}
    >
      {/* Desktop Layout */}
      <div className="hidden lg:block px-4 py-4">
        {/* Row 1: Checkbox | Waiting On | Subject | Time Status */}
        <div className="flex items-center gap-3 mb-1.5">
          {/* Checkbox - visible on hover or when checked */}
          {onCheckChange && (
            <div 
              className={`flex-shrink-0 transition-opacity ${isChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              onClick={handleCheckboxClick}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={handleCheckboxChange}
                className="w-4 h-4 rounded bg-transparent cursor-pointer appearance-none border-2 border-zinc-500 outline-none focus:outline-none focus:ring-0 relative checked:border-white checked:after:content-['✓'] checked:after:absolute checked:after:text-white checked:after:text-xs checked:after:font-bold checked:after:left-1/2 checked:after:top-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2"
              />
            </div>
          )}
          
          {/* Unread Indicator + Waiting On - Fixed Width */}
          <div className="w-40 flex-shrink-0 flex items-center gap-2">
            {/* Orange dot for unread */}
            {isUnread ? (
              <div className="w-1.5 h-1.5 rounded-full bg-[#f7ac5c] flex-shrink-0" />
            ) : (
              <div className="w-1.5 h-1.5 flex-shrink-0" />
            )}
            <span className={`text-sm truncate block ${isUnread ? 'font-semibold text-white' : 'font-medium text-zinc-300'}`}>
              {displayName}
            </span>
          </div>

          {/* Subject - Flexible */}
          <div className="flex-1 min-w-0">
            <span className={`text-sm truncate block ${isUnread ? 'text-zinc-300' : 'text-zinc-400'}`}>
              {thread.gmail_subject}
            </span>
          </div>

          {/* Time Status - Fixed Width */}
          <div className="w-28 flex-shrink-0 text-right">
            <span className={`text-xs ${isOverdue ? 'text-red-400' : 'text-zinc-500'}`}>
              {waitingText}
            </span>
          </div>
        </div>

        {/* Row 2: Awaiting Summary */}
        <div className="pl-8">
          <p className="text-sm text-zinc-500 truncate italic">
            "{thread.ui_summary_awaiting || commitment?.what || 'Waiting for response'}"
          </p>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden px-4 py-4">
        {/* Row 1: Checkbox + Waiting On + Time Status */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            {/* Checkbox - always visible on mobile when enabled */}
            {onCheckChange && (
              <div className="flex-shrink-0" onClick={handleCheckboxClick}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={handleCheckboxChange}
                  className="w-4 h-4 rounded bg-transparent cursor-pointer appearance-none border-2 border-zinc-500 outline-none focus:outline-none focus:ring-0 relative checked:border-white checked:after:content-['✓'] checked:after:absolute checked:after:text-white checked:after:text-xs checked:after:font-bold checked:after:left-1/2 checked:after:top-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2"
                />
              </div>
            )}
            {/* Orange dot for unread */}
            {isUnread && (
              <div className="w-1.5 h-1.5 rounded-full bg-[#f7ac5c] flex-shrink-0" />
            )}
            <span className={`text-sm truncate ${isUnread ? 'font-semibold text-white' : 'font-medium text-zinc-300'}`}>
              {displayName}
            </span>
          </div>
          <span className={`text-xs flex-shrink-0 ${isOverdue ? 'text-red-400' : 'text-zinc-500'}`}>
            {waitingText}
          </span>
        </div>

        {/* Row 2: Subject */}
        <div className="mb-1">
          <span className={`text-sm truncate block ${isUnread ? 'text-zinc-300' : 'text-zinc-400'}`}>
            {thread.gmail_subject}
          </span>
        </div>

        {/* Row 3: Awaiting Summary */}
        <p className="text-sm text-zinc-500 truncate italic">
          "{thread.ui_summary_awaiting || commitment?.what || 'Waiting for response'}"
        </p>
      </div>
    </div>
  );
}