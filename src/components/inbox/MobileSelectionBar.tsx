// MobileSelectionBar.tsx - Mobile action bar for selection mode
// Appears above normal header when items are selected

import React from 'react';
import { Check, Trash2, Mail, MailOpen, Undo2 } from 'lucide-react';

interface MobileSelectionBarProps {
  selectedCount: number;
  totalCount: number;
  isAllSelected: boolean;
  onSelectAll: () => void;
  // Optional action handlers based on page type
  onMarkRead?: () => void;
  onMarkUnread?: () => void;
  onMarkDone?: () => void;
  onDelete?: () => void;
  onUndo?: () => void;
}

export const MobileSelectionBar = React.memo(function MobileSelectionBar({
  selectedCount,
  totalCount,
  isAllSelected,
  onSelectAll,
  onMarkRead,
  onMarkUnread,
  onMarkDone,
  onDelete,
  onUndo
}: MobileSelectionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="lg:hidden flex items-center justify-between h-12 px-3 bg-[#1a1a1a] border-b border-zinc-800">
      {/* Left: Select All Checkbox + Count */}
      <div className="flex items-center gap-3">
        <div 
          className="flex items-center justify-center w-8 h-8"
          onClick={onSelectAll}
        >
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={() => {}}
            className="w-4 h-4 rounded bg-transparent cursor-pointer appearance-none border-2 border-zinc-500 checked:border-white relative checked:after:content-['✓'] checked:after:absolute checked:after:text-white checked:after:text-xs checked:after:font-bold checked:after:left-1/2 checked:after:top-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2"
            onClick={(e) => {
              e.stopPropagation();
              onSelectAll();
            }}
          />
        </div>
        <span className="text-sm text-zinc-300">
          {selectedCount} selected
        </span>
      </div>

      {/* Right: Action Icons */}
      <div className="flex items-center gap-1">
        {onMarkRead && (
          <button
            onClick={onMarkRead}
            className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
            title="Mark as read"
          >
            <MailOpen className="w-5 h-5" />
          </button>
        )}
        {onMarkUnread && (
          <button
            onClick={onMarkUnread}
            className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
            title="Mark as unread"
          >
            <Mail className="w-5 h-5" />
          </button>
        )}
        {onMarkDone && (
          <button
            onClick={onMarkDone}
            className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
            title="Mark as done"
          >
            <Check className="w-5 h-5" />
          </button>
        )}
        {onUndo && (
          <button
            onClick={onUndo}
            className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
            title="Undo"
          >
            <Undo2 className="w-5 h-5" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
});