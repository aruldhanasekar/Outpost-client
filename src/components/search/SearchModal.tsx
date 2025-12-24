// SearchModal.tsx - AI-powered email search modal
// Features:
// - Natural language search + Gmail-style operators
// - Draggable modal (like ComposeModal)
// - Expandable view (like ThreadDetail expanded overlay)
// - Two-panel layout: Results list + Email detail
// - Keyboard shortcut: "/" to open, Enter to search, Esc to close

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, GripHorizontal, Search, AlertCircle } from 'lucide-react';
import { SearchInput } from './SearchInput';
import { SearchResultList } from './SearchResultList';
import { SearchEmailDetail } from './SearchEmailDetail';
import { SearchOperatorsHelp } from './SearchOperatorsHelp';
import { searchEmails, SearchResult } from '@/services/searchApi';
import { auth } from '@/firebase.config';

// Expand icon SVG component
const ExpandIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
    <path d="M408 64L552 64C565.3 64 576 74.7 576 88L576 232C576 241.7 570.2 250.5 561.2 254.2C552.2 257.9 541.9 255.9 535 249L496 210L409 297C399.6 306.4 384.4 306.4 375.1 297L343.1 265C333.7 255.6 333.7 240.4 343.1 231.1L430.1 144.1L391.1 105.1C384.2 98.2 382.2 87.9 385.9 78.9C389.6 69.9 398.3 64 408 64zM232 576L88 576C74.7 576 64 565.3 64 552L64 408C64 398.3 69.8 389.5 78.8 385.8C87.8 382.1 98.1 384.2 105 391L144 430L231 343C240.4 333.6 255.6 333.6 264.9 343L296.9 375C306.3 384.4 306.3 399.6 296.9 408.9L209.9 495.9L248.9 534.9C255.8 541.8 257.8 552.1 254.1 561.1C250.4 570.1 241.7 576 232 576z"/>
  </svg>
);

// Minimize icon SVG component
const MinimizeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
    <path d="M503.5 71C512.9 61.6 528.1 61.6 537.4 71L569.4 103C578.8 112.4 578.8 127.6 569.4 136.9L482.4 223.9L521.4 262.9C528.3 269.8 530.3 280.1 526.6 289.1C522.9 298.1 514.2 304 504.5 304L360.5 304C347.2 304 336.5 293.3 336.5 280L336.5 136C336.5 126.3 342.3 117.5 351.3 113.8C360.3 110.1 370.6 112.1 377.5 119L416.5 158L503.5 71zM136.5 336L280.5 336C293.8 336 304.5 346.7 304.5 360L304.5 504C304.5 513.7 298.7 522.5 289.7 526.2C280.7 529.9 270.4 527.9 263.5 521L224.5 482L137.5 569C128.1 578.4 112.9 578.4 103.6 569L71.6 537C62.2 527.6 62.2 512.4 71.6 503.1L158.6 416.1L119.6 377.1C112.7 370.2 110.7 359.9 114.4 350.9C118.1 341.9 126.8 336 136.5 336z"/>
  </svg>
);

interface Position {
  x: number;
  y: number;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export function SearchModal({ isOpen, onClose, userEmail }: SearchModalProps) {
  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Selected email for detail view
  const [selectedEmail, setSelectedEmail] = useState<SearchResult | null>(null);
  
  // UI state
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOperatorsHelp, setShowOperatorsHelp] = useState(false);
  
  // Drag state
  const [position, setPosition] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Input ref for focus
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setError(null);
      setHasSearched(false);
      setSelectedEmail(null);
      setIsExpanded(false);
      setPosition(null);
      setShowOperatorsHelp(false);
    }
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in input (except for Escape and Enter)
      const isInInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      
      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showOperatorsHelp) {
          setShowOperatorsHelp(false);
        } else if (selectedEmail) {
          setSelectedEmail(null);
        } else {
          onClose();
        }
        return;
      }
      
      // Enter to search (only in input)
      if (e.key === 'Enter' && isInInput && query.trim()) {
        e.preventDefault();
        handleSearch();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, query, showOperatorsHelp, selectedEmail, onClose]);

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent) => {
    if (isExpanded) return; // Don't allow dragging in expanded mode
    if (!modalRef.current) return;
    
    const rect = modalRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  };

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      const maxX = window.innerWidth - (modalRef.current?.offsetWidth || 900);
      const maxY = window.innerHeight - (modalRef.current?.offsetHeight || 600) - 48;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Search handler
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setError(null);
    setHasSearched(true);
    setSelectedEmail(null);
    
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const searchResults = await searchEmails(query, token);
      setResults(searchResults);
      
      // Auto-select first result if available
      if (searchResults.length > 0) {
        setSelectedEmail(searchResults[0]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  // Toggle expand
  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
    if (!isExpanded) {
      setPosition(null); // Reset position when expanding
    }
  }, [isExpanded]);

  if (!isOpen) return null;

  // Expanded overlay mode
  if (isExpanded) {
    return (
      <>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/60 z-50"
          onClick={onClose}
        />
        
        {/* Expanded Modal */}
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-8">
          <div 
            ref={modalRef}
            className="pointer-events-auto flex flex-col bg-[#2d2d2d] rounded-2xl shadow-2xl overflow-hidden"
            style={{ width: '90%', maxWidth: '1400px', height: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700/50">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-[#8FA8A3]" />
                <h2 className="text-base font-semibold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  AI Search
                </h2>
                {hasSearched && (
                  <span className="text-sm text-zinc-500">
                    {results.length} result{results.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={handleToggleExpand}
                  className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
                  title="Minimize"
                >
                  <MinimizeIcon />
                </button>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Search Input */}
            <div className="px-6 py-4 border-b border-zinc-700/50">
              <SearchInput
                ref={inputRef}
                value={query}
                onChange={setQuery}
                onSearch={handleSearch}
                onShowHelp={() => setShowOperatorsHelp(true)}
                isSearching={isSearching}
                placeholder='Search emails... Try "from:john about the invoice" or "has:attachment newer_than:1w"'
              />
            </div>
            
            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
              {/* Results List Panel */}
              <div className="w-[35%] border-r border-zinc-700/50 overflow-hidden flex flex-col">
                <SearchResultList
                  results={results}
                  selectedId={selectedEmail?.id || null}
                  onSelect={setSelectedEmail}
                  isSearching={isSearching}
                  hasSearched={hasSearched}
                  error={error}
                />
              </div>
              
              {/* Email Detail Panel */}
              <div className="flex-1 overflow-hidden flex flex-col bg-[#252525]">
                <SearchEmailDetail
                  email={selectedEmail}
                  userEmail={userEmail}
                />
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-3 border-t border-zinc-700/50 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span>Searched: Inbox, Sent, Done, Trash</span>
                <span>•</span>
                <button 
                  onClick={() => setShowOperatorsHelp(true)}
                  className="text-[#8FA8A3] hover:text-[#a3bbb7] transition-colors"
                >
                  View search operators
                </button>
              </div>
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400 font-mono">Enter</kbd> Search</span>
                <span><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400 font-mono">Esc</kbd> Close</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Operators Help Modal */}
        {showOperatorsHelp && (
          <SearchOperatorsHelp onClose={() => setShowOperatorsHelp(false)} />
        )}
      </>
    );
  }

  // Normal modal mode (draggable)
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div 
        className={`fixed z-50 pointer-events-none ${position ? '' : 'top-0 left-0 right-0 bottom-12 flex items-center justify-center p-4'}`}
        style={position ? { top: 0, left: 0, right: 0, bottom: 48 } : undefined}
      >
        <div 
          ref={modalRef}
          data-modal="search"
          className={`pointer-events-auto bg-[#2d2d2d] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-shadow ${isDragging ? 'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]' : ''}`}
          style={{ 
            width: '100%',
            maxWidth: '900px',
            height: '600px',
            maxHeight: '85vh',
            ...(position ? {
              position: 'absolute',
              left: position.x,
              top: position.y,
            } : {})
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Draggable */}
          <div 
            className={`flex items-center justify-between px-5 py-4 border-b border-zinc-700/50 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={handleDragStart}
          >
            <div className="flex items-center gap-2">
              <GripHorizontal className="w-4 h-4 text-zinc-600" />
              <Search className="w-4 h-4 text-[#8FA8A3]" />
              <h2 className="text-base font-semibold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
                AI Search
              </h2>
              {hasSearched && (
                <span className="text-sm text-zinc-500 ml-2">
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
              <button 
                onClick={handleToggleExpand}
                className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
                title="Expand"
              >
                <ExpandIcon />
              </button>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Search Input */}
          <div className="px-5 py-4 border-b border-zinc-700/50">
            <SearchInput
              ref={inputRef}
              value={query}
              onChange={setQuery}
              onSearch={handleSearch}
              onShowHelp={() => setShowOperatorsHelp(true)}
              isSearching={isSearching}
              placeholder='Try "from:john invoice" or "emails about the project deadline"'
            />
          </div>
          
          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Results List Panel */}
            <div className={`${selectedEmail ? 'w-[35%] border-r border-zinc-700/50' : 'w-full'} overflow-hidden flex flex-col`}>
              <SearchResultList
                results={results}
                selectedId={selectedEmail?.id || null}
                onSelect={setSelectedEmail}
                isSearching={isSearching}
                hasSearched={hasSearched}
                error={error}
              />
            </div>
            
            {/* Email Detail Panel */}
            {selectedEmail && (
              <div className="flex-1 overflow-hidden flex flex-col bg-[#252525]">
                <SearchEmailDetail
                  email={selectedEmail}
                  userEmail={userEmail}
                />
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="px-5 py-2.5 border-t border-zinc-700/50 flex items-center justify-between">
            <button 
              onClick={() => setShowOperatorsHelp(true)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Search operators help
            </button>
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400 font-mono">Enter</kbd> Search</span>
              <span><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400 font-mono">Esc</kbd> Close</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Operators Help Modal */}
      {showOperatorsHelp && (
        <SearchOperatorsHelp onClose={() => setShowOperatorsHelp(false)} />
      )}
    </>
  );
}

export default SearchModal;