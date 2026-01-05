// ThreadList.tsx - Thread list for URGENT/IMPORTANT/OTHERS categories
// v2.1: Removed date separators
// v2.2: Added context menu props
// v2.3: Added mobile selection mode props

import { Loader2 } from 'lucide-react';
import { Thread } from './promiseTypes';
import { ThreadListItem } from './ThreadListItem';

interface ThreadListProps {
  threads: Thread[];
  loading: boolean;
  error: string | null;
  selectedThreadId: string | null;
  isCompact?: boolean;
  checkedThreadIds?: Set<string>;
  isSelectionMode?: boolean;  // Mobile selection mode
  isInitialSyncing?: boolean; // Show spinner instead of empty message during initial sync
  onThreadClick: (thread: Thread) => void;
  onCheckChange?: (thread: Thread, checked: boolean) => void;
  onLongPress?: (thread: Thread) => void;  // Long-press to enter selection mode
  onMarkDone?: (thread: Thread) => void;
  onDelete?: (thread: Thread) => void;
  emptyMessage?: string;
  // New props for context menu
  allLabels?: Array<{ id: string; name: string; color: string }>;
  onReply?: (thread: Thread) => void;
  onReplyAll?: (thread: Thread) => void;
  onForward?: (thread: Thread) => void;
  onMarkRead?: (thread: Thread) => void;
  onMarkUnread?: (thread: Thread) => void;
  onToggleLabel?: (thread: Thread, labelId: string, labelName: string, isApplied: boolean) => void;
  onCreateLabel?: () => void;
}

export function ThreadList({ 
  threads, 
  loading, 
  error, 
  selectedThreadId,
  isCompact = false,
  checkedThreadIds = new Set(),
  isSelectionMode = false,
  isInitialSyncing = false,
  onThreadClick,
  onCheckChange,
  onLongPress,
  onMarkDone,
  onDelete,
  emptyMessage = 'No threads in this category',
  // New props
  allLabels = [],
  onReply,
  onReplyAll,
  onForward,
  onMarkRead,
  onMarkUnread,
  onToggleLabel,
  onCreateLabel
}: ThreadListProps) {
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-48 px-4">
        <p className="text-zinc-500 text-sm text-center">
          Error loading threads: {error}
        </p>
      </div>
    );
  }

  // Empty state
  if (threads.length === 0) {
    // Show spinner during initial sync instead of empty message
    if (isInitialSyncing) {
      return (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-48 px-4">
        <p className="text-zinc-500 text-sm text-center">
          {emptyMessage}
        </p>
      </div>
    );
  }

  // Render threads directly without date grouping
  return (
    <div>
      {threads.map((thread) => (
        <ThreadListItem
          key={thread.thread_id}
          thread={thread}
          isSelected={thread.thread_id === selectedThreadId}
          isCompact={isCompact}
          isChecked={checkedThreadIds.has(thread.thread_id)}
          isSelectionMode={isSelectionMode}
          onClick={() => onThreadClick(thread)}
          onCheckChange={onCheckChange}
          onLongPress={onLongPress}
          onMarkDone={onMarkDone}
          onDelete={onDelete}
          // New props for context menu
          allLabels={allLabels}
          onReply={onReply}
          onReplyAll={onReplyAll}
          onForward={onForward}
          onMarkRead={onMarkRead}
          onMarkUnread={onMarkUnread}
          onToggleLabel={onToggleLabel}
          onCreateLabel={onCreateLabel}
        />
      ))}
    </div>
  );
}