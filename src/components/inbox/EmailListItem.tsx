// EmailListItem.tsx - Email list item with hover actions (tick, delete) and checkbox
// Performance optimized with React.memo and specific CSS transitions
// v2.0: Added mobile selection mode with long-press

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Email } from './types';
import { Check, Trash2, Undo2 } from 'lucide-react';
import { cleanSnippet } from '@/utils/formatters';

interface EmailListItemProps {
  email: Email;
  isSelected: boolean;
  isCompact: boolean;
  isChecked?: boolean;
  isSelectionMode?: boolean;  // Mobile selection mode
  onClick: () => void;
  onCheckChange?: (email: Email, checked: boolean) => void;
  onLongPress?: (email: Email) => void;  // Long-press to enter selection mode
  onMarkDone?: (email: Email) => void;
  onDelete?: (email: Email) => void;
  showMarkDone?: boolean;
  isDonePage?: boolean;
}

export const EmailListItem = React.memo(function EmailListItem({ 
  email, 
  isSelected,
  isCompact,
  isChecked = false,
  isSelectionMode = false,
  onClick, 
  onCheckChange,
  onLongPress,
  onMarkDone,
  onDelete,
  showMarkDone = true,
  isDonePage = false
}: EmailListItemProps) {
  
  // Memoized handlers
  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCheckChange?.(email, !isChecked);
  }, [email, isChecked, onCheckChange]);

  const handleMarkDone = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onMarkDone?.(email);
  }, [email, onMarkDone]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete?.(email);
  }, [email, onDelete]);
  
  const handleRowClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input[type="checkbox"]')) {
      return;
    }
    // In selection mode on mobile, tap toggles checkbox instead of opening detail
    if (isSelectionMode) {
      onCheckChange?.(email, !isChecked);
      return;
    }
    onClick();
  }, [onClick, isSelectionMode, email, isChecked, onCheckChange]);

  const stopPropagation = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  // Long-press state for mobile selection mode
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressDuration = 500; // 500ms for long-press
  
  // Long-press handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsLongPressing(true);
    longPressTimerRef.current = setTimeout(() => {
      // Trigger long-press action
      onLongPress?.(email);
      // Also check the email
      onCheckChange?.(email, true);
      setIsLongPressing(false);
    }, longPressDuration);
  }, [email, onLongPress, onCheckChange]);

  const handleTouchEnd = useCallback(() => {
    setIsLongPressing(false);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    // Cancel long-press if user moves finger
    setIsLongPressing(false);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Clean the preview to show only latest email content
  const preview = cleanSnippet(email.preview || '');

  return (
    <div
      onClick={handleRowClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      className={`
        group relative cursor-pointer transition-all duration-150
        ${isChecked 
          ? 'bg-[#8FA8A3]/20 backdrop-blur-sm' 
          : isSelected 
            ? 'bg-zinc-700/40' 
            : 'hover:shadow-[0_2px_8px_rgba(0,0,0,0.4)] hover:z-10 hover:scale-[1.01]'
        }
        ${isLongPressing ? 'scale-[0.98] bg-zinc-700/30' : ''}
      `}
    >
      {/* Mobile Layout - Always Stacked */}
      <div className="lg:hidden flex items-start px-4 py-4">
        {/* Checkbox container - visible in selection mode or when checked */}
        <div 
          className={`w-5 flex-shrink-0 flex justify-center pt-1 transition-opacity duration-150 ${isSelectionMode || isChecked ? 'opacity-100' : 'opacity-0'}`}
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

        {/* Unread Dot container - fixed width, always takes space */}
        <div className="w-4 flex-shrink-0 flex justify-center pt-1.5">
          {!email.isRead && (
            <div className="w-1.5 h-1.5 rounded-full bg-[#8FA8A3]" />
          )}
        </div>

        {/* Email Content - always starts at same position */}
        <div className="flex-1 min-w-0">
          {/* Top Row: Sender + Time */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`text-sm truncate ${!email.isRead ? 'text-white font-semibold' : 'text-zinc-300'}`}>
              {email.sender}
            </span>
            
            <span className="text-xs text-zinc-500 flex-shrink-0">
              {email.time}
            </span>
          </div>

          {/* Subject */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm truncate ${!email.isRead ? 'text-white font-medium' : 'text-zinc-400'}`}>
              {email.subject}
            </span>
            {email.hasAttachment && (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-zinc-500 flex-shrink-0">
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            )}
          </div>

          {/* Preview */}
          <p className="text-sm text-zinc-500 truncate">
            {preview}
          </p>
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
            {/* Checkbox + Unread Dot + Sender Name - Fixed Width */}
            <div className="w-48 flex-shrink-0 flex items-center">
              {/* Checkbox container - fixed width, always takes space */}
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
              
              {/* Unread Dot container - fixed width, always takes space */}
              <div className="w-4 flex-shrink-0 flex justify-center">
                {!email.isRead && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#8FA8A3]" />
                )}
              </div>
              
              {/* Sender - always starts at same position */}
              <span className={`text-sm truncate block ${!email.isRead ? 'text-white font-semibold' : 'text-zinc-300'}`}>
                {email.sender}
              </span>
            </div>

            {/* Subject + Preview - Flexible */}
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <span className={`text-sm flex-shrink-0 ${!email.isRead ? 'text-white font-medium' : 'text-zinc-400'}`}>
                {email.subject}
              </span>
              <span className="text-zinc-600 flex-shrink-0">—</span>
              <span className="text-sm text-zinc-500 truncate">
                {preview}
              </span>
            </div>

            {/* Attachment Icon */}
            <div className="w-6 flex-shrink-0 flex justify-center">
              {email.hasAttachment && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-zinc-500">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              )}
            </div>

            {/* Action Buttons (hover) + Time (fixed) */}
            <div className="flex items-center flex-shrink-0">
              {/* Action Buttons - visible on hover, left of time */}
              <div className="hidden group-hover:flex items-center mr-3">
                {showMarkDone && (
                  <button
                    onClick={handleMarkDone}
                    onMouseDown={stopPropagation}
                    className="p-1 hover:bg-zinc-600/50 rounded transition-colors duration-100 text-zinc-400 hover:text-white"
                    title={isDonePage ? "Mark as undone" : "Mark as done"}
                  >
                    {isDonePage ? <Undo2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </button>
                )}
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
                {email.time}
              </span>
            </div>
          </>
        )}

        {/* When compact - Vertical */}
        {isCompact && (
          <>
            {/* Top Row: Checkbox + Dot + Sender + Actions + Time */}
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="flex items-center min-w-0">
                {/* Checkbox container - fixed width, always takes space */}
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
                
                {/* Unread Dot container - fixed width, always takes space */}
                <div className="w-4 flex-shrink-0 flex justify-center">
                  {!email.isRead && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#8FA8A3]" />
                  )}
                </div>
                
                {/* Sender - always starts at same position */}
                <span className={`text-sm truncate ${!email.isRead ? 'text-white font-semibold' : 'text-zinc-300'}`}>
                  {email.sender}
                </span>
              </div>
              
              <div className="flex items-center flex-shrink-0">
                {/* Action Buttons - visible on hover */}
                <div className="hidden group-hover:flex items-center mr-2">
                  {showMarkDone && (
                    <button
                      onClick={handleMarkDone}
                      onMouseDown={stopPropagation}
                      className="p-1 hover:bg-zinc-600/50 rounded transition-colors duration-100 text-zinc-400 hover:text-white"
                      title={isDonePage ? "Mark as undone" : "Mark as done"}
                    >
                      {isDonePage ? <Undo2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </button>
                  )}
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
                  {email.time}
                </span>
              </div>
            </div>

            {/* Subject - aligned with sender (checkbox w-5 + dot w-4 = 36px = 2.25rem) */}
            <div className="flex items-center gap-2 w-full pl-9">
              <span className={`text-sm truncate ${!email.isRead ? 'text-white font-medium' : 'text-zinc-400'}`}>
                {email.subject}
              </span>
              {email.hasAttachment && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-zinc-500 flex-shrink-0">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              )}
            </div>

            {/* Preview - aligned with subject */}
            <p className="text-sm text-zinc-500 truncate w-full pl-9">
              {preview}
            </p>
          </>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these specific props changed
  return (
    prevProps.email.id === nextProps.email.id &&
    prevProps.email.isRead === nextProps.email.isRead &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isCompact === nextProps.isCompact &&
    prevProps.isChecked === nextProps.isChecked &&
    prevProps.isSelectionMode === nextProps.isSelectionMode &&
    prevProps.showMarkDone === nextProps.showMarkDone &&
    prevProps.isDonePage === nextProps.isDonePage
  );
});