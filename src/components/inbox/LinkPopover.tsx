// LinkPopover.tsx - Custom popover for link insertion
// Dark themed popover matching app design

import { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';

interface LinkPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (url: string) => void;
  initialUrl?: string;
  position?: { x: number; y: number };
}

export function LinkPopover({ 
  isOpen, 
  onClose, 
  onApply, 
  initialUrl = '',
  position 
}: LinkPopoverProps) {
  const [url, setUrl] = useState(initialUrl);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  // Focus input when popover opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);
  
  // Reset URL when popover opens
  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl);
    }
  }, [isOpen, initialUrl]);
  
  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    // Delay to prevent immediate close
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);
  
  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };
  
  // Validate and apply link
  const handleApply = () => {
    let finalUrl = url.trim();
    
    // Add https:// if no protocol specified
    if (finalUrl && !finalUrl.match(/^https?:\/\//)) {
      finalUrl = 'https://' + finalUrl;
    }
    
    if (finalUrl) {
      onApply(finalUrl);
    }
    onClose();
  };
  
  // Handle remove link
  const handleRemove = () => {
    onApply('');
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      ref={popoverRef}
      className="absolute z-[60] bg-[#3d3d3d] rounded-lg shadow-xl border border-zinc-600/50 p-3 w-72"
      style={{
        bottom: position?.y ?? '100%',
        left: position?.x ?? '50%',
        transform: position ? 'none' : 'translateX(-50%)',
        marginBottom: '8px'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-400 font-medium">Insert Link</span>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-zinc-600/50 rounded transition-colors text-zinc-400 hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      
      {/* URL Input */}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://example.com"
          className="flex-1 bg-[#2d2d2d] text-white text-sm px-3 py-2 rounded-lg outline-none border border-zinc-600/50 focus:border-[#f7ac5c]/50 placeholder:text-zinc-600"
        />
        <button
          onClick={handleApply}
          disabled={!url.trim()}
          className={`
            p-2 rounded-lg transition-colors
            ${url.trim() 
              ? 'bg-[#f7ac5c] hover:bg-[#f5a043] text-white' 
              : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
            }
          `}
          title="Apply"
        >
          <Check className="w-4 h-4" />
        </button>
      </div>
      
      {/* Remove link option (only if editing existing link) */}
      {initialUrl && (
        <button
          onClick={handleRemove}
          className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          Remove link
        </button>
      )}
    </div>
  );
}