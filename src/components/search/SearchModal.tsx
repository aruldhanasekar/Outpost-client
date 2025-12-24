// SearchModal.tsx - Search modal with instant results as user types

import { useEffect, useRef, useState, useMemo } from 'react';
import { X, Search, Paperclip, Mail, Send, Archive, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { SearchableEmail } from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmailSelect?: (email: SearchableEmail) => void;
  userEmail?: string; // Optional, for compatibility
}

// Parse search query into operators and keywords
function parseQuery(query: string) {
  const operators: { type: string; value: string }[] = [];
  let keywords: string[] = [];
  
  const operatorRegex = /(from|to|subject|has|in|is|category):(\S+)/gi;
  let remaining = query;
  let match;
  
  while ((match = operatorRegex.exec(query)) !== null) {
    operators.push({ 
      type: match[1].toLowerCase(), 
      value: match[2].toLowerCase() 
    });
    remaining = remaining.replace(match[0], '');
  }
  
  // Extract quoted phrases
  const quotedRegex = /"([^"]+)"/g;
  while ((match = quotedRegex.exec(remaining)) !== null) {
    keywords.push(match[1].toLowerCase());
    remaining = remaining.replace(match[0], '');
  }
  
  // Remaining words
  const words = remaining.trim().split(/\s+/).filter(w => w.length > 0);
  keywords = [...keywords, ...words.map(w => w.toLowerCase())];
  
  return { operators, keywords };
}

// Check if email matches query
function matchesQuery(email: SearchableEmail, operators: { type: string; value: string }[], keywords: string[]): boolean {
  // Check operators
  for (const op of operators) {
    switch (op.type) {
      case 'from':
        if (!email.sender.toLowerCase().includes(op.value) && 
            !email.sender_email.toLowerCase().includes(op.value)) {
          return false;
        }
        break;
      case 'to': {
        const toMatch = email.recipients.some(r => r.toLowerCase().includes(op.value));
        if (!toMatch) return false;
        break;
      }
      case 'subject':
        if (!email.subject.toLowerCase().includes(op.value)) return false;
        break;
      case 'has':
        if (op.value === 'attachment' && !email.has_attachment) return false;
        break;
      case 'in':
        if (email.source !== op.value) return false;
        break;
      case 'is':
        if (op.value === 'unread' && email.is_read) return false;
        if (op.value === 'read' && !email.is_read) return false;
        break;
      case 'category':
        if (email.category.toLowerCase() !== op.value) return false;
        break;
    }
  }
  
  // Check keywords
  for (const keyword of keywords) {
    const searchable = `${email.subject} ${email.sender} ${email.sender_email} ${email.snippet}`.toLowerCase();
    if (!searchable.includes(keyword)) return false;
  }
  
  return true;
}

// Format date
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

// Source icon
function SourceIcon({ source }: { source: string }) {
  const className = "w-3.5 h-3.5";
  switch (source) {
    case 'sent': return <Send className={className} />;
    case 'done': return <Archive className={className} />;
    case 'trash': return <Trash2 className={className} />;
    default: return <Mail className={className} />;
  }
}

export function SearchModal({ isOpen, onClose, onEmailSelect }: SearchModalProps) {
  const { currentUser } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const hasFetchedRef = useRef(false);
  
  const [emails, setEmails] = useState<SearchableEmail[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Fetch emails when modal opens
  useEffect(() => {
    if (!isOpen || !currentUser || hasFetchedRef.current) return;
    
    const fetchEmails = async () => {
      setLoading(true);
      setError(null);
      hasFetchedRef.current = true;
      
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch(`${API_URL}/api/emails/searchable?limit=300`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (!response.ok) throw new Error('Failed to fetch');
        
        const data = await response.json();
        setEmails(data.emails || []);
      } catch (err) {
        setError('Failed to load emails');
        hasFetchedRef.current = false; // Allow retry on error
      } finally {
        setLoading(false);
      }
    };
    
    fetchEmails();
  }, [isOpen, currentUser]);
  
  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);
  
  // Filter results instantly
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const { operators, keywords } = parseQuery(query);
    if (operators.length === 0 && keywords.length === 0) return [];
    return emails.filter(email => matchesQuery(email, operators, keywords));
  }, [emails, query]);
  
  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);
  
  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, Math.min(results.length - 1, 19)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        onEmailSelect?.(results[selectedIndex]);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose, onEmailSelect]);
  
  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-zinc-900 rounded-xl shadow-2xl border border-zinc-700/50 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-700/50">
          <Search className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search emails... (from:name, subject:text, has:attachment)"
            className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none text-base"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 hover:bg-zinc-700/50 rounded">
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-700/50 rounded">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
        
        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-[#8FA8A3] animate-spin" />
              <span className="ml-3 text-zinc-400">Loading emails...</span>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-red-400">{error}</div>
          ) : !query.trim() ? (
            <div className="py-8 px-4 text-center text-zinc-500">
              <p className="mb-3">Start typing to search</p>
              <div className="text-xs space-y-1 text-zinc-600">
                <p><span className="text-zinc-500">from:</span>sender • <span className="text-zinc-500">to:</span>recipient • <span className="text-zinc-500">subject:</span>text</p>
                <p><span className="text-zinc-500">has:</span>attachment • <span className="text-zinc-500">in:</span>inbox/sent/done/trash</p>
                <p><span className="text-zinc-500">is:</span>read/unread • <span className="text-zinc-500">category:</span>urgent/important</p>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              No emails found for "{query}"
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {results.slice(0, 20).map((email, index) => (
                <div
                  key={email.id}
                  onClick={() => onEmailSelect?.(email)}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    index === selectedIndex ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Unread indicator */}
                    <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                      email.is_read ? 'bg-transparent' : 'bg-[#8FA8A3]'
                    }`} />
                    
                    <div className="flex-1 min-w-0">
                      {/* Sender + Date */}
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={`truncate ${email.is_read ? 'text-zinc-300' : 'text-white font-medium'}`}>
                          {email.sender || email.sender_email}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {email.has_attachment && <Paperclip className="w-3.5 h-3.5 text-zinc-500" />}
                          <span className="text-xs text-zinc-500">{formatDate(email.date)}</span>
                        </div>
                      </div>
                      
                      {/* Subject */}
                      <div className={`truncate text-sm ${email.is_read ? 'text-zinc-400' : 'text-zinc-200'}`}>
                        {email.subject || '(no subject)'}
                      </div>
                      
                      {/* Snippet */}
                      <div className="truncate text-xs text-zinc-500 mt-0.5">
                        {email.snippet}
                      </div>
                      
                      {/* Tags */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
                          email.source === 'inbox' ? 'bg-blue-500/10 text-blue-400' :
                          email.source === 'sent' ? 'bg-green-500/10 text-green-400' :
                          email.source === 'done' ? 'bg-zinc-500/10 text-zinc-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          <SourceIcon source={email.source} />
                          {email.source}
                        </span>
                        {email.category && email.category !== 'OTHERS' && (
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            email.category === 'URGENT' ? 'bg-red-500/10 text-red-400' :
                            email.category === 'IMPORTANT' ? 'bg-orange-500/10 text-orange-400' :
                            email.category === 'PROMISES' ? 'bg-purple-500/10 text-purple-400' :
                            email.category === 'AWAITING' ? 'bg-yellow-500/10 text-yellow-400' :
                            'bg-zinc-500/10 text-zinc-400'
                          }`}>
                            {email.category.toLowerCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {results.length > 20 && (
                <div className="py-3 text-center text-sm text-zinc-500">
                  Showing 20 of {results.length} results
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-2 border-t border-zinc-700/50 text-xs text-zinc-500 flex items-center justify-between">
          <span>{results.length > 0 && `${results.length} result${results.length === 1 ? '' : 's'}`}</span>
          <span className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↑↓</kbd> navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↵</kbd> open</span>
            <span><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">esc</kbd> close</span>
          </span>
        </div>
      </div>
    </div>
  );
}