// EmailList.tsx - Email list container with date grouping and action callbacks

import { Loader2 } from 'lucide-react';
import { Email } from './types';
import { EmailListItem } from './EmailListItem';

interface EmailListProps {
  emails: Email[];
  loading: boolean;
  error: string | null;
  selectedEmailId: string | null; // ID of currently selected email
  isCompact?: boolean; // When true, use vertical layout (detail panel is open)
  checkedEmailIds?: Set<string>; // IDs of checked emails
  onEmailClick: (email: Email) => void;
  onCheckChange?: (email: Email, checked: boolean) => void;
  onMarkDone?: (email: Email) => void;
  onDelete?: (email: Email) => void;
  showMarkDone?: boolean; // false for Sent page
  isDonePage?: boolean; // true for Done page (shows undo icon)
}

// Helper function to get date group label
function getDateGroup(timeStr: string, dateStr: string): string {
  if (!dateStr && !timeStr) return 'Other';
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  
  // Check time string first for today/yesterday
  if (timeStr) {
    if (timeStr.includes('AM') || timeStr.includes('PM')) {
      return 'Today';
    } else if (timeStr === 'Yesterday') {
      return 'Yesterday';
    }
  }
  
  // Parse the full date string (format: "Dec 9, 2024")
  if (!dateStr) return 'Other';
  
  const emailDate = new Date(dateStr);
  if (isNaN(emailDate.getTime())) {
    return 'Other';
  }
  
  // Calculate week boundaries
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday of this week
  
  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
  
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  
  // Check which group
  if (emailDate >= today) {
    return 'Today';
  } else if (emailDate >= yesterday) {
    return 'Yesterday';
  } else if (emailDate >= startOfWeek) {
    // This week - show day name + date
    const dayName = emailDate.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = emailDate.getDate();
    return `${dayName} ${dayNum}`;
  } else if (emailDate >= startOfLastWeek) {
    return 'Last Week';
  } else if (emailDate >= startOfMonth) {
    // Earlier this month
    const dayName = emailDate.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = emailDate.getDate();
    return `${dayName} ${dayNum}`;
  } else if (emailDate >= startOfLastMonth && emailDate <= endOfLastMonth) {
    return 'Last Month';
  } else {
    // Older - show month name and year
    return emailDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
}

// Group emails by date
function groupEmailsByDate(emails: Email[]): Map<string, Email[]> {
  const groups = new Map<string, Email[]>();
  
  emails.forEach(email => {
    const group = getDateGroup(email.time, email.date);
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)!.push(email);
  });
  
  // Sort groups in logical order
  const sortedGroups = new Map<string, Email[]>();
  
  // First add standard groups in order
  ['Today', 'Yesterday'].forEach(key => {
    if (groups.has(key)) {
      sortedGroups.set(key, groups.get(key)!);
      groups.delete(key);
    }
  });
  
  // Add day-specific groups (Mon 9, Tue 10, etc.) - sorted by day number descending
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
  
  // Add Last Week and Last Month
  ['Last Week', 'Last Month'].forEach(key => {
    if (groups.has(key)) {
      sortedGroups.set(key, groups.get(key)!);
      groups.delete(key);
    }
  });
  
  // Add remaining month groups (sorted by date, most recent first)
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

export function EmailList({ 
  emails, 
  loading, 
  error, 
  selectedEmailId,
  isCompact = false,
  checkedEmailIds = new Set(),
  onEmailClick,
  onCheckChange,
  onMarkDone,
  onDelete,
  showMarkDone = true,
  isDonePage = false
}: EmailListProps) {
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
          Error loading emails: {error}
        </p>
      </div>
    );
  }

  // Empty state
  if (emails.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 px-4">
        <p className="text-zinc-500 text-sm text-center">
          No emails in this category
        </p>
      </div>
    );
  }

  // Group emails by date
  const groupedEmails = groupEmailsByDate(emails);

  // Email list without date section headers
  return (
    <div>
      {Array.from(groupedEmails.entries()).map(([group, groupEmails]) => (
        <div key={group}>
          {/* Emails in this group */}
          {groupEmails.map((email) => (
            <EmailListItem
              key={email.id}
              email={email}
              isSelected={email.id === selectedEmailId}
              isCompact={isCompact}
              isChecked={checkedEmailIds.has(email.id)}
              onClick={() => onEmailClick(email)}
              onCheckChange={onCheckChange}
              onMarkDone={onMarkDone}
              onDelete={onDelete}
              showMarkDone={showMarkDone}
              isDonePage={isDonePage}
            />
          ))}
        </div>
      ))}
    </div>
  );
}