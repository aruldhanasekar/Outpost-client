// ThreadListItem.tsx - Individual thread item for URGENT/IMPORTANT/OTHERS
// v2.0: Uses last_email_sender and last_email_snippet for proper Gmail/Superhuman style display

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Check, Trash2 } from 'lucide-react';

// Use Thread type from promiseTypes
import { Thread } from './promiseTypes';
import { formatDisplayTime, cleanSnippet } from '@/utils/formatters';

// ======================================================
// LABEL CHIP COMPONENT
// ======================================================
interface LabelChipProps {
  label: { id: string; name: string; color: string };
}

const LabelChip = ({ label }: LabelChipProps) => (
  <span
    className="px-2 py-0.5 text-xs rounded-full backdrop-blur-sm border border-white/20 text-white whitespace-nowrap"
    style={{ backgroundColor: `${label.color}CC` }} // CC = 80% opacity
  >
    {label.name}
  </span>
);

// ======================================================
// LABELS DISPLAY COMPONENT WITH OVERFLOW
// ======================================================
interface LabelsDisplayProps {
  labels: Array<{ id: string; name: string; color: string }>;
  maxWidth?: number;
}

const LabelsDisplay = ({ labels, maxWidth = 150 }: LabelsDisplayProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(labels.length);
  
  useEffect(() => {
    if (!containerRef.current || labels.length === 0) {
      setVisibleCount(labels.length);
      return;
    }
    
    // Reset to show all, then measure
    setVisibleCount(labels.length);
    
    // Use requestAnimationFrame to measure after render
    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const children = Array.from(container.children) as HTMLElement[];
      
      let totalWidth = 0;
      let count = 0;
      const moreTagWidth = 45; // Approximate width of "+X more" tag
      
      for (let i = 0; i < children.length; i++) {
        const childWidth = children[i].offsetWidth + 4; // 4px gap
        
        // Check if adding this label would exceed maxWidth
        // Leave room for "+X more" tag if there are more labels after this
        const remainingLabels = labels.length - (i + 1);
        const needsMoreTag = remainingLabels > 0;
        const availableWidth = needsMoreTag ? maxWidth - moreTagWidth : maxWidth;
        
        if (totalWidth + childWidth <= availableWidth) {
          totalWidth += childWidth;
          count++;
        } else {
          break;
        }
      }
      
      setVisibleCount(Math.max(1, count)); // Show at least 1 label
    });
  }, [labels, maxWidth]);
  
  if (!labels || labels.length === 0) return null;
  
  const visibleLabels = labels.slice(0, visibleCount);
  const hiddenCount = labels.length - visibleCount;
  
  return (
    <div ref={containerRef} className="flex items-center gap-1 flex-shrink-0">
      {visibleLabels.map((label) => (
        <LabelChip key={label.id} label={label} />
      ))}
      {hiddenCount > 0 && (
        <span className="px-2 py-0.5 text-xs rounded-full bg-zinc-600/80 backdrop-blur-sm border border-white/20 text-zinc-300 whitespace-nowrap">
          +{hiddenCount} more
        </span>
      )}
    </div>
  );
};

interface ThreadListItemProps {
  thread: Thread;
  isSelected: boolean;
  isCompact: boolean;
  isChecked?: boolean;
  onClick: () => void;
  onCheckChange?: (thread: Thread, checked: boolean) => void;
  onMarkDone?: (thread: Thread) => void;
  onDelete?: (thread: Thread) => void;
}

// Helper: Get display name from thread data
// Priority: last_email_sender > participants > fallback
function getDisplayName(thread: Thread): string {
  // v2.0: First try last_email_sender (proper name from backend)
  if (thread.last_email_sender && thread.last_email_sender.trim()) {
    return thread.last_email_sender;
  }
  
  // Fallback to participants array
  if (thread.participants && thread.participants.length > 0) {
    const firstParticipant = thread.participants[0];
    
    // Extract name from "Name <email>" format
    const match = firstParticipant.match(/^([^<]+)</);
    if (match) {
      return match[1].trim().replace(/"/g, '');
    }
    
    // Try to extract name from email: capitalize first part
    const atIndex = firstParticipant.indexOf('@');
    if (atIndex > 0) {
      const namePart = firstParticipant.substring(0, atIndex);
      // Capitalize first letter of each word
      return namePart
        .split(/[._-]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    
    return firstParticipant;
  }
  
  return 'Unknown';
}


// Helper: Get snippet/preview from thread
function getSnippet(thread: Thread): string {
  // v2.0: Use last_email_snippet (actual email content preview)
  if (thread.last_email_snippet && thread.last_email_snippet.trim()) {
    return cleanSnippet(thread.last_email_snippet);
  }
  
  // Fallback to ai_context_summary
  if (thread.ai_context_summary && thread.ai_context_summary.trim()) {
    return cleanSnippet(thread.ai_context_summary);
  }
  
  return '';
}

export function ThreadListItem({ 
  thread, 
  isSelected,
  isCompact,
  isChecked = false,
  onClick, 
  onCheckChange,
  onMarkDone,
  onDelete
}: ThreadListItemProps) {
  
  const displayName = getDisplayName(thread);
  const time = formatDisplayTime(thread.last_email_date);
  const emailCount = thread.email_ids?.length || thread.email_count || 1;
  const hasMultipleEmails = emailCount > 1;
  const snippet = getSnippet(thread);
  
  // Get labels from thread (if available)
  const threadLabels = (thread as any).labels || [];
  
  // Memoized handlers
  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCheckChange?.(thread, !isChecked);
  }, [thread, isChecked, onCheckChange]);

  const handleMarkDone = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onMarkDone?.(thread);
  }, [thread, onMarkDone]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete?.(thread);
  }, [thread, onDelete]);
  
  const handleRowClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input[type="checkbox"]')) {
      return;
    }
    onClick();
  }, [onClick]);

  const stopPropagation = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  return (
    <div
      onClick={handleRowClick}
      className={`
        group relative cursor-pointer transition-[background-color,box-shadow,transform] duration-150
        ${isChecked 
          ? 'bg-[#8FA8A3]/20 backdrop-blur-sm' 
          : isSelected 
            ? 'bg-zinc-700/40' 
            : 'hover:shadow-[0_2px_8px_rgba(0,0,0,0.4)] hover:z-10 hover:scale-[1.01]'
        }
      `}
    >
      {/* Mobile Layout - Always Stacked */}
      <div className="lg:hidden flex items-start px-4 py-4">
        {/* Checkbox container */}
        <div 
          className={`w-5 flex-shrink-0 flex justify-center pt-1 transition-opacity duration-150 ${isChecked ? 'opacity-100' : 'opacity-0 group-active:opacity-100'}`}
          onClick={handleCheckboxClick}
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => {}}
            className="w-4 h-4 rounded bg-transparent cursor-pointer appearance-none border-2 border-zinc-500 checked:border-white relative checked:after:content-['✓'] checked:after:absolute checked:after:text-white checked:after:text-xs checked:after:font-bold checked:after:left-1/2 checked:after:top-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2"
            onClick={handleCheckboxClick}
          />
        </div>

        {/* Unread Dot container */}
        <div className="w-4 flex-shrink-0 flex justify-center pt-1.5">
          {!thread.is_read && (
            <div className="w-1.5 h-1.5 rounded-full bg-[#f7ac5c]" />
          )}
        </div>

        {/* Thread Content */}
        <div className="flex-1 min-w-0">
          {/* Top Row: Sender + Labels + Email Count + Time */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-sm truncate ${!thread.is_read ? 'text-white font-semibold' : 'text-zinc-300'}`}>
                {displayName}
              </span>
              {/* Labels - Mobile */}
              {threadLabels.length > 0 && (
                <LabelsDisplay labels={threadLabels} maxWidth={100} />
              )}
              {hasMultipleEmails && (
                <span className="text-xs text-zinc-500 flex-shrink-0">
                  ({emailCount})
                </span>
              )}
            </div>
            <span className="text-xs text-zinc-500 flex-shrink-0">
              {time}
            </span>
          </div>

          {/* Subject */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm truncate ${!thread.is_read ? 'text-white font-medium' : 'text-zinc-400'}`}>
              {thread.gmail_subject}
            </span>
          </div>

          {/* Preview/Snippet */}
          {snippet && (
            <p className="text-sm text-zinc-500 truncate">
              {snippet}
            </p>
          )}
        </div>
      </div>

      {/* Desktop Layout - Horizontal when NOT compact, Vertical when compact */}
      <div className={`
        hidden lg:flex items-center gap-4 px-6 py-3
        ${isCompact ? 'flex-col !items-start !gap-1 !py-4 !px-4' : ''}
      `}>
        {/* When NOT compact - Horizontal */}
        {!isCompact && (
          <>
            {/* Checkbox + Sender Name + Labels - Fixed Width */}
            <div className="w-64 flex-shrink-0 flex items-center">
              {/* Checkbox container */}
              <div 
                className={`w-5 flex-shrink-0 flex justify-center transition-opacity duration-150 ${isChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                onClick={handleCheckboxClick}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}}
                  className="w-4 h-4 rounded bg-transparent cursor-pointer appearance-none border-2 border-zinc-500 checked:border-white relative checked:after:content-['✓'] checked:after:absolute checked:after:text-white checked:after:text-xs checked:after:font-bold checked:after:left-1/2 checked:after:top-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2"
                  onClick={handleCheckboxClick}
                />
              </div>
              
              {/* Unread Dot container */}
              <div className="w-4 flex-shrink-0 flex justify-center">
                {!thread.is_read && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#f7ac5c]" />
                )}
              </div>
              
              {/* Sender + Labels + Email Count */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`text-sm truncate ${!thread.is_read ? 'text-white font-semibold' : 'text-zinc-300'}`}>
                  {displayName}
                </span>
                {/* Labels - Desktop */}
                {threadLabels.length > 0 && (
                  <LabelsDisplay labels={threadLabels} maxWidth={150} />
                )}
                {hasMultipleEmails && (
                  <span className="text-xs text-zinc-500 flex-shrink-0">
                    ({emailCount})
                  </span>
                )}
              </div>
            </div>

            {/* Subject + Preview - Flexible */}
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <span className={`text-sm flex-shrink-0 max-w-[40%] truncate ${!thread.is_read ? 'text-white font-medium' : 'text-zinc-400'}`}>
                {thread.gmail_subject}
              </span>
              {snippet && (
                <>
                  <span className="text-zinc-600 flex-shrink-0">—</span>
                  <span className="text-sm text-zinc-500 truncate">
                    {snippet}
                  </span>
                </>
              )}
            </div>

            {/* Action Buttons (hover) + Time (fixed) */}
            <div className="flex items-center flex-shrink-0">
              {/* Action Buttons - visible on hover */}
              <div className="hidden group-hover:flex items-center mr-3">
                <button
                  onClick={handleMarkDone}
                  onMouseDown={stopPropagation}
                  className="p-1 hover:bg-zinc-600/50 rounded transition-colors duration-100 text-zinc-400 hover:text-white"
                  title="Mark as done"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDelete}
                  onMouseDown={stopPropagation}
                  className="p-1 hover:bg-zinc-600/50 rounded transition-colors duration-100 text-zinc-400 hover:text-white"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              {/* Time - always visible, fixed width */}
              <span className="text-xs text-zinc-500 w-14 text-right">
                {time}
              </span>
            </div>
          </>
        )}

        {/* When compact - Vertical */}
        {isCompact && (
          <>
            {/* Top Row: Checkbox + Sender + Labels + Email Count + Actions + Time */}
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="flex items-center min-w-0">
                {/* Checkbox container */}
                <div 
                  className={`w-5 flex-shrink-0 flex justify-center transition-opacity duration-150 ${isChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                  onClick={handleCheckboxClick}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="w-4 h-4 rounded bg-transparent cursor-pointer appearance-none border-2 border-zinc-500 checked:border-white relative checked:after:content-['✓'] checked:after:absolute checked:after:text-white checked:after:text-xs checked:after:font-bold checked:after:left-1/2 checked:after:top-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2"
                    onClick={handleCheckboxClick}
                  />
                </div>
                
                {/* Unread Dot container */}
                <div className="w-4 flex-shrink-0 flex justify-center">
                  {!thread.is_read && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#f7ac5c]" />
                  )}
                </div>
                
                {/* Sender + Labels + Email Count */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`text-sm truncate ${!thread.is_read ? 'text-white font-semibold' : 'text-zinc-300'}`}>
                    {displayName}
                  </span>
                  {/* Labels - Compact */}
                  {threadLabels.length > 0 && (
                    <LabelsDisplay labels={threadLabels} maxWidth={120} />
                  )}
                  {hasMultipleEmails && (
                    <span className="text-xs text-zinc-500 flex-shrink-0">
                      ({emailCount})
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center flex-shrink-0">
                {/* Action Buttons - visible on hover */}
                <div className="hidden group-hover:flex items-center mr-2">
                  <button
                    onClick={handleMarkDone}
                    onMouseDown={stopPropagation}
                    className="p-1 hover:bg-zinc-600/50 rounded transition-colors duration-100 text-zinc-400 hover:text-white"
                    title="Mark as done"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDelete}
                    onMouseDown={stopPropagation}
                    className="p-1 hover:bg-zinc-600/50 rounded transition-colors duration-100 text-zinc-400 hover:text-white"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Time - always visible */}
                <span className="text-xs text-zinc-500">
                  {time}
                </span>
              </div>
            </div>

            {/* Subject */}
            <div className="flex items-center gap-2 w-full pl-9">
              <span className={`text-sm truncate ${!thread.is_read ? 'text-white font-medium' : 'text-zinc-400'}`}>
                {thread.gmail_subject}
              </span>
            </div>

            {/* Preview/Snippet */}
            {snippet && (
              <p className="text-sm text-zinc-500 truncate w-full pl-9">
                {snippet}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}