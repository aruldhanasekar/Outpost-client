// GifPickerModal.tsx - GIF picker modal using backend proxy
// Fetches GIFs from /api/giphy/search and /api/giphy/trending
// Matches Outpost dark theme design

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Search, Loader2, TrendingUp } from 'lucide-react';

interface GifData {
  id: string;
  title: string;
  url: string;
  preview: {
    url: string;
    width: string;
    height: string;
    webp?: string;
  };
  full: {
    url: string;
    width: string;
    height: string;
  };
  original: {
    url: string;
    width: string;
    height: string;
    webp?: string;
  };
}

interface GifPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string, gifAlt: string) => void;
}

export function GifPickerModal({ isOpen, onClose, onSelect }: GifPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<GifData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'trending' | 'search'>('trending');
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch trending GIFs on mount
  useEffect(() => {
    if (isOpen) {
      fetchTrending();
      // Focus search input when modal opens
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setGifs([]);
      setError(null);
      setMode('trending');
    }
  }, [isOpen]);

  // Fetch trending GIFs
  const fetchTrending = async () => {
    setIsLoading(true);
    setError(null);
    setMode('trending');
    
    try {
      const response = await fetch('/api/giphy/trending?limit=20');
      
      if (!response.ok) {
        throw new Error('Failed to fetch trending GIFs');
      }
      
      const data = await response.json();
      setGifs(data.data || []);
    } catch (err) {
      console.error('Failed to fetch trending GIFs:', err);
      setError('Failed to load GIFs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Search GIFs with debouncing
  const searchGifs = useCallback(async (query: string) => {
    if (!query.trim()) {
      fetchTrending();
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setMode('search');
    
    try {
      const response = await fetch(`/api/giphy/search?q=${encodeURIComponent(query)}&limit=20`);
      
      if (!response.ok) {
        throw new Error('Failed to search GIFs');
      }
      
      const data = await response.json();
      setGifs(data.data || []);
    } catch (err) {
      console.error('Failed to search GIFs:', err);
      setError('Failed to search GIFs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle search input change with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Debounce search
    debounceRef.current = setTimeout(() => {
      searchGifs(query);
    }, 300);
  };

  // Handle GIF selection
  const handleGifSelect = (gif: GifData) => {
    // Use downsized version for email (good quality, reasonable size)
    const gifUrl = gif.full?.url || gif.original?.url || gif.preview?.url;
    const gifAlt = gif.title || 'GIF';
    
    onSelect(gifUrl, gifAlt);
    onClose();
  };

  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="pointer-events-auto bg-[#2d2d2d] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
          style={{ maxHeight: '80vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700/50">
            <h3 className="text-base font-semibold text-white">Choose a GIF</h3>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Search Input */}
          <div className="px-4 py-3 border-b border-zinc-700/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search GIFs..."
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700/50 rounded-xl text-white text-sm placeholder:text-zinc-500 outline-none focus:border-[#f7ac5c]/50 focus:ring-1 focus:ring-[#f7ac5c]/20 transition-all"
              />
            </div>
          </div>
          
          {/* Mode indicator */}
          {mode === 'trending' && !searchQuery && (
            <div className="flex items-center gap-1.5 px-4 py-2 text-xs text-zinc-500">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Trending</span>
            </div>
          )}
          
          {/* GIF Grid */}
          <div className="flex-1 overflow-y-auto p-3 min-h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-[#f7ac5c] animate-spin" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-zinc-400 text-sm mb-3">{error}</p>
                <button
                  onClick={() => searchQuery ? searchGifs(searchQuery) : fetchTrending()}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : gifs.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-zinc-500 text-sm">
                  {searchQuery ? 'No GIFs found. Try a different search.' : 'No GIFs available.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {gifs.map((gif) => (
                  <button
                    key={gif.id}
                    onClick={() => handleGifSelect(gif)}
                    className="relative aspect-video bg-zinc-800 rounded-lg overflow-hidden group hover:ring-2 hover:ring-[#f7ac5c] transition-all"
                  >
                    <img
                      src={gif.preview?.webp || gif.preview?.url}
                      alt={gif.title || 'GIF'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Footer - GIPHY Attribution */}
          <div className="flex items-center justify-center px-4 py-2.5 border-t border-zinc-700/30 bg-zinc-800/50">
            <a 
              href="https://giphy.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              <span>Powered by</span>
              <svg 
                width="60" 
                height="14" 
                viewBox="0 0 163 35" 
                fill="currentColor"
                className="opacity-70"
              >
                <path d="M4.66406 30.3281H0V4.92188H4.66406V30.3281ZM4.66406 0H0V4.67188H4.66406V0ZM9.32812 0V4.67188H14V0H9.32812ZM14 4.67188V9.32812H18.6641V4.67188H14ZM18.6641 9.32812H23.3359V25.6562H18.6641V9.32812ZM23.3359 25.6562V30.3281H14V35H23.3359H28V30.3281H23.3359ZM28 25.6562H23.3359V9.32812H28V4.67188V0H23.3359V4.67188H18.6641V0H14V4.67188H9.32812V9.32812H14V4.67188H18.6641V9.32812V25.6562V30.3281H23.3359V35H28V30.3281V25.6562ZM32.6641 30.3281H37.3359V4.92188H32.6641V30.3281ZM37.3359 4.92188H42V0H37.3359V4.92188ZM42 4.92188V9.32812H46.6641V4.92188H42ZM46.6641 9.32812H51.3359V14H46.6641V9.32812ZM51.3359 14V4.92188H56V14H51.3359ZM56 14H51.3359V18.6719H56V14ZM51.3359 18.6719V30.3281H46.6641V18.6719H51.3359ZM46.6641 18.6719H42V30.3281H46.6641V18.6719ZM42 30.3281H37.3359V35H42V30.3281ZM56 18.6719V30.3281H60.6641V18.6719H56ZM60.6641 30.3281H56V35H60.6641V30.3281ZM65.3281 30.3281H60.6641V18.6719H65.3281V30.3281ZM65.3281 18.6719V14H69.9922V18.6719H65.3281ZM69.9922 14H65.3281V9.32812H69.9922V14ZM69.9922 9.32812V4.92188H74.6641V9.32812H69.9922ZM74.6641 4.92188V0H79.3281V4.92188H74.6641ZM79.3281 4.92188H84V9.32812H79.3281V4.92188ZM79.3281 9.32812H74.6641V14H79.3281V9.32812ZM79.3281 14V18.6719H74.6641V14H79.3281ZM74.6641 18.6719H79.3281V30.3281H74.6641V18.6719ZM79.3281 30.3281H84V35H79.3281V30.3281ZM84 30.3281V18.6719H88.6641V30.3281H84ZM88.6641 18.6719H84V14H88.6641V18.6719ZM88.6641 14V9.32812H93.3281V14H88.6641ZM93.3281 9.32812V4.92188H98V9.32812H93.3281ZM98 4.92188V0H88.6641V4.92188H93.3281V9.32812H88.6641V4.92188H84V9.32812H79.3281V4.92188H74.6641V0H65.3281V4.92188H69.9922V9.32812H65.3281V4.92188H60.6641V9.32812V14H56V9.32812H51.3359V4.92188H56V0H46.6641V4.92188H42V0H32.6641V4.92188V30.3281V35H37.3359V30.3281H42V35H51.3359V30.3281H56V35H60.6641V30.3281H65.3281V35H74.6641V30.3281H79.3281V35H88.6641V30.3281H93.3281V35H98V30.3281V9.32812V4.92188ZM102.672 30.3281H107.328V20H102.672V30.3281ZM107.328 20H112V15.3281H107.328V20ZM112 15.3281V9.32812H116.672V15.3281H112ZM116.672 9.32812V4.92188H121.328V9.32812H116.672ZM121.328 4.92188V0H126V4.92188H121.328ZM126 4.92188H130.672V9.32812H126V4.92188ZM130.672 9.32812H135.328V15.3281H130.672V9.32812ZM135.328 15.3281H140V20H135.328V15.3281ZM140 20H144.672V30.3281H140V20ZM144.672 30.3281H149.328V35H144.672V30.3281ZM149.328 35H154V30.3281H149.328V35ZM154 30.3281H158.672V25.6562H154V30.3281ZM158.672 25.6562H163V20H158.672V25.6562ZM158.672 20V15.3281H154V20H158.672ZM154 15.3281V9.32812H149.328V15.3281H154ZM149.328 9.32812V4.92188H144.672V9.32812H149.328ZM144.672 4.92188V0H140V4.92188H144.672ZM140 0H135.328V4.92188H140V0ZM135.328 4.92188H130.672V0H126V4.92188V9.32812H121.328V4.92188H116.672V0H107.328V4.92188H112V9.32812H107.328V4.92188H102.672V9.32812V15.3281V20V30.3281V35H107.328V30.3281H112V35H116.672V30.3281H121.328V35H126V30.3281H130.672V35H135.328V30.3281V20V15.3281V9.32812V4.92188Z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}