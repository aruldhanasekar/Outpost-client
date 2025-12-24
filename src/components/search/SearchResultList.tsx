// SearchResultList.tsx - Search results list component
// Features:
// - Shows list of matching emails
// - Highlights selected email
// - Loading state
// - Empty state
// - Error state

import { Loader2, Mail, Paperclip, AlertCircle, Search, Inbox, Send, Archive, Trash2 } from 'lucide-react';
import { SearchResult } from '@/services/searchApi';

interface SearchResultListProps {
  results: SearchResult[];
  selectedId: string | null;
  onSelect: (email: SearchResult) => void;
  isSearching: boolean;
  hasSearched: boolean;
  error: string | null;
}

// Source icon mapping
const SourceIcon = ({ source }: { source: string }) => {
  switch (source) {
    case 'sent':
      return <Send className="w-3 h-3" />;
    case 'done':
      return <Archive className="w-3 h-3" />;
    case 'trash':
      return <Trash2 className="w-3 h-3" />;
    default:
      return <Inbox className="w-3 h-3" />;
  }
};

// Category badge colors
const categoryColors: Record<string, string> = {
  'URGENT': 'bg-red-500/20 text-red-400 border-red-500/30',
  'IMPORTANT': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'PROMISES': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'AWAITING': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'OTHERS': 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

// Format date for display
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    }
  } catch {
    return dateString;
  }
};

export function SearchResultList({
  results,
  selectedId,
  onSelect,
  isSearching,
  hasSearched,
  error
}: SearchResultListProps) {
  // Loading state
  if (isSearching) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-[#8FA8A3] animate-spin mb-4" />
        <p className="text-zinc-400 text-sm">Searching with AI...</p>
        <p className="text-zinc-500 text-xs mt-1">Analyzing your emails</p>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <AlertCircle className="w-8 h-8 text-red-400 mb-4" />
        <p className="text-red-400 text-sm font-medium">Search failed</p>
        <p className="text-zinc-500 text-xs mt-1 text-center">{error}</p>
      </div>
    );
  }
  
  // Empty state - before search
  if (!hasSearched) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <Search className="w-12 h-12 text-zinc-600 mb-4" />
        <p className="text-zinc-400 text-sm font-medium">Search your emails</p>
        <p className="text-zinc-500 text-xs mt-2 text-center max-w-[240px]">
          Use natural language or operators like <code className="text-[#8FA8A3]">from:</code>, <code className="text-[#8FA8A3]">has:attachment</code>
        </p>
      </div>
    );
  }
  
  // Empty state - no results
  if (results.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <Mail className="w-12 h-12 text-zinc-600 mb-4" />
        <p className="text-zinc-400 text-sm font-medium">No results found</p>
        <p className="text-zinc-500 text-xs mt-2 text-center max-w-[240px]">
          Try different keywords or search operators
        </p>
      </div>
    );
  }
  
  // Results list
  return (
    <div className="flex-1 overflow-y-auto hide-scrollbar">
      {results.map((email, index) => {
        const isSelected = email.id === selectedId;
        const isUnread = !email.is_read;
        
        return (
          <div
            key={email.id}
            onClick={() => onSelect(email)}
            className={`
              px-4 py-3 cursor-pointer transition-colors border-b border-zinc-700/30
              ${isSelected 
                ? 'bg-[#8FA8A3]/10 border-l-2 border-l-[#8FA8A3]' 
                : 'hover:bg-zinc-800/50 border-l-2 border-l-transparent'
              }
            `}
          >
            {/* Top row: Sender + Date */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Unread indicator */}
                {isUnread && (
                  <div className="w-2 h-2 bg-[#8FA8A3] rounded-full flex-shrink-0" />
                )}
                {/* Sender name */}
                <span className={`text-sm truncate ${isUnread ? 'font-semibold text-white' : 'text-zinc-300'}`}>
                  {email.sender}
                </span>
              </div>
              {/* Date */}
              <span className="text-xs text-zinc-500 flex-shrink-0 ml-2">
                {formatDate(email.date)}
              </span>
            </div>
            
            {/* Subject */}
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm truncate ${isUnread ? 'font-medium text-zinc-200' : 'text-zinc-400'}`}>
                {email.subject || '(No subject)'}
              </span>
              {email.has_attachment && (
                <Paperclip className="w-3 h-3 text-zinc-500 flex-shrink-0" />
              )}
            </div>
            
            {/* Snippet */}
            <p className="text-xs text-zinc-500 truncate mb-2">
              {email.snippet || email.body_preview || 'No preview available'}
            </p>
            
            {/* Bottom row: Category + Source */}
            <div className="flex items-center gap-2">
              {/* Category badge */}
              {email.category && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${categoryColors[email.category] || categoryColors['OTHERS']}`}>
                  {email.category}
                </span>
              )}
              {/* Source indicator */}
              <div className="flex items-center gap-1 text-zinc-500">
                <SourceIcon source={email.source} />
                <span className="text-[10px] capitalize">{email.source}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default SearchResultList;