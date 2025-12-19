// PromiseListItem.tsx - Individual promise item in list
// v2.1: Use last_email_sender for display, add unread indicator, add checkbox

import { Thread, extractNameFromEmail, getDeadlineText, getPrimaryPromise } from './promiseTypes';

interface PromiseListItemProps {
  thread: Thread;
  isSelected: boolean;
  onClick: () => void;
  // v2.1: Checkbox support
  isChecked?: boolean;
  onCheckChange?: (checked: boolean) => void;
}

// Helper: Get display name with proper fallback
function getDisplayName(thread: Thread): string {
  // Priority 1: Use last_email_sender if available
  if (thread.last_email_sender && thread.last_email_sender.trim()) {
    return thread.last_email_sender;
  }
  
  // Priority 2: Extract from commitment who_owes
  const commitment = getPrimaryPromise(thread);
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
  
  return 'Unknown';
}

export function PromiseListItem({ thread, isSelected, onClick, isChecked = false, onCheckChange }: PromiseListItemProps) {
  const commitment = getPrimaryPromise(thread);
  const displayName = getDisplayName(thread);
  const deadline = commitment?.deadline || null;
  const deadlineText = getDeadlineText(deadline);
  const isUnread = thread.is_read === false;

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
        {/* Row 1: Checkbox | Who Owes | Subject | Deadline */}
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
          
          {/* Unread Indicator + Who Owes - Fixed Width */}
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

          {/* Deadline - Fixed Width */}
          <div className="w-24 flex-shrink-0 text-right">
            <span className="text-xs text-zinc-500">
              {deadlineText}
            </span>
          </div>
        </div>

        {/* Row 2: Promise Summary */}
        <div className="pl-8">
          <p className="text-sm text-zinc-500 truncate italic">
            "{thread.ui_summary_promise || 'No promise summary available'}"
          </p>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden px-4 py-4">
        {/* Row 1: Checkbox + Who Owes + Deadline */}
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
          <span className="text-xs text-zinc-500 flex-shrink-0">
            {deadlineText}
          </span>
        </div>

        {/* Row 2: Subject */}
        <div className="mb-1">
          <span className={`text-sm truncate block ${isUnread ? 'text-zinc-300' : 'text-zinc-400'}`}>
            {thread.gmail_subject}
          </span>
        </div>

        {/* Row 3: Promise Summary */}
        <p className="text-sm text-zinc-500 truncate italic">
          "{thread.ui_summary_promise || 'No promise summary'}"
        </p>
      </div>
    </div>
  );
}