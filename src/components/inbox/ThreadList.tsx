// ThreadList.tsx - Thread list for URGENT/IMPORTANT/OTHERS categories
// v2.1: Removed date separators

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
  onThreadClick: (thread: Thread) => void;
  onCheckChange?: (thread: Thread, checked: boolean) => void;
  onMarkDone?: (thread: Thread) => void;
  onDelete?: (thread: Thread) => void;
  emptyMessage?: string;
}

export function ThreadList({ 
  threads, 
  loading, 
  error, 
  selectedThreadId,
  isCompact = false,
  checkedThreadIds = new Set(),
  onThreadClick,
  onCheckChange,
  onMarkDone,
  onDelete,
  emptyMessage = 'No threads in this category'
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
          onClick={() => onThreadClick(thread)}
          onCheckChange={onCheckChange}
          onMarkDone={onMarkDone}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}