// useSearch.ts - Custom hook for search functionality
// Features:
// - Global search state management
// - Keyboard shortcut handling ("/" to open)
// - Search history (optional)

import { useState, useEffect, useCallback } from 'react';
import { searchEmails, SearchResult } from '@/services/searchApi';
import { auth } from '@/firebase.config';

interface UseSearchOptions {
  enableKeyboardShortcut?: boolean;
}

interface UseSearchReturn {
  // Modal state
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
  
  // Search state
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  isSearching: boolean;
  error: string | null;
  hasSearched: boolean;
  
  // Actions
  search: (query?: string) => Promise<void>;
  clearResults: () => void;
  
  // Selected result
  selectedResult: SearchResult | null;
  setSelectedResult: (result: SearchResult | null) => void;
}

export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const { enableKeyboardShortcut = true } = options;
  
  // Modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Selected result
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  
  // Modal controls
  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    // Reset state on close
    setQuery('');
    setResults([]);
    setError(null);
    setHasSearched(false);
    setSelectedResult(null);
  }, []);
  const toggleSearch = useCallback(() => setIsSearchOpen(prev => !prev), []);
  
  // Search function
  const search = useCallback(async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;
    
    setIsSearching(true);
    setError(null);
    setHasSearched(true);
    setSelectedResult(null);
    
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const searchResults = await searchEmails(q, token);
      setResults(searchResults);
      
      // Auto-select first result
      if (searchResults.length > 0) {
        setSelectedResult(searchResults[0]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query]);
  
  // Clear results
  const clearResults = useCallback(() => {
    setResults([]);
    setHasSearched(false);
    setError(null);
    setSelectedResult(null);
  }, []);
  
  // Keyboard shortcut: "/" to open search
  useEffect(() => {
    if (!enableKeyboardShortcut) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[data-modal]') // Don't trigger inside modals
      ) {
        return;
      }
      
      // "/" key to open search
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcut]);
  
  return {
    // Modal state
    isSearchOpen,
    openSearch,
    closeSearch,
    toggleSearch,
    
    // Search state
    query,
    setQuery,
    results,
    isSearching,
    error,
    hasSearched,
    
    // Actions
    search,
    clearResults,
    
    // Selected result
    selectedResult,
    setSelectedResult,
  };
}

export default useSearch;