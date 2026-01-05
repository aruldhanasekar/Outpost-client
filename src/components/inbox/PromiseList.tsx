// PromiseList.tsx - List of promises grouped by date
// v2.1: Added checkbox selection support

import { Loader2 } from 'lucide-react';
import { Thread } from './promiseTypes';
import { PromiseListItem } from './PromiseListItem';

interface PromiseListProps {
  threads: Thread[];
  loading: boolean;
  error: string | null;
  selectedThread: Thread | null;
  onThreadClick: (thread: Thread) => void;
  // v2.1: Checkbox support
  checkedThreadIds?: Set<string>;
  onCheckChange?: (thread: Thread, checked: boolean) => void;
  isInitialSyncing?: boolean; // Show spinner instead of empty message during initial sync
}

// Helper: Parse date from various formats
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  return new Date(0);
}

// Helper: Get date group label
function getDateGroup(dateStr: string): string {
  if (!dateStr) return 'Other';
  
  const date = parseDate(dateStr);
  if (isNaN(date.getTime())) return 'Other';
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  // Calculate week boundaries
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  
  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
  
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  if (itemDate >= today) {
    return 'Today';
  } else if (itemDate >= yesterday) {
    return 'Yesterday';
  } else if (itemDate >= startOfWeek) {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = date.getDate();
    return `${dayName} ${dayNum}`;
  } else if (itemDate >= startOfLastWeek) {
    return 'Last Week';
  } else if (itemDate >= startOfMonth) {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = date.getDate();
    return `${dayName} ${dayNum}`;
  } else if (itemDate >= startOfLastMonth && itemDate <= endOfLastMonth) {
    return 'Last Month';
  } else {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
}

// Group threads by date
function groupThreadsByDate(threads: Thread[]): Map<string, Thread[]> {
  const groups = new Map<string, Thread[]>();
  
  threads.forEach(thread => {
    const group = getDateGroup(thread.last_email_date);
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)!.push(thread);
  });
  
  // Sort groups in logical order
  const sortedGroups = new Map<string, Thread[]>();
  
  ['Today', 'Yesterday'].forEach(key => {
    if (groups.has(key)) {
      sortedGroups.set(key, groups.get(key)!);
      groups.delete(key);
    }
  });
  
  // Add day-specific groups
  const dayGroups: string[] = [];
  groups.forEach((_, key) => {
    if (key.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s\d+$/)) {
      dayGroups.push(key);
    }
  });
  dayGroups.sort((a, b) => {
    const numA = parseInt(a.split(' ')[1]);
    const numB = parseInt(b.split(' ')[1]);
    return numB - numA;
  });
  dayGroups.forEach(key => {
    sortedGroups.set(key, groups.get(key)!);
    groups.delete(key);
  });
  
  ['Last Week', 'Last Month'].forEach(key => {
    if (groups.has(key)) {
      sortedGroups.set(key, groups.get(key)!);
      groups.delete(key);
    }
  });
  
  // Add remaining month groups
  const monthGroups = Array.from(groups.keys()).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateB.getTime() - dateA.getTime();
  });
  monthGroups.forEach(key => {
    sortedGroups.set(key, groups.get(key)!);
  });
  
  return sortedGroups;
}

export function PromiseList({ 
  threads, 
  loading, 
  error, 
  selectedThread, 
  onThreadClick,
  checkedThreadIds = new Set(),
  onCheckChange,
  isInitialSyncing = false
}: PromiseListProps) {
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
          Error loading promises: {error}
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
          No promises to track
        </p>
      </div>
    );
  }

  // Group threads by date
  const groupedThreads = groupThreadsByDate(threads);

  return (
    <div>
      {Array.from(groupedThreads.entries()).map(([group, groupThreads]) => (
        <div key={group}>
          {/* Threads - No date headers */}
          {groupThreads.map((thread) => (
            <PromiseListItem
              key={thread.thread_id}
              thread={thread}
              isSelected={selectedThread?.thread_id === thread.thread_id}
              onClick={() => onThreadClick(thread)}
              isChecked={checkedThreadIds.has(thread.thread_id)}
              onCheckChange={onCheckChange ? (checked) => onCheckChange(thread, checked) : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  );
}