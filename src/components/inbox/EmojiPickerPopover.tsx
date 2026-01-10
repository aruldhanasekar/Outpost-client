// EmojiPickerPopover.tsx - Emoji picker dropdown using emoji-mart
// Dark theme styling to match Outpost design
//
// Install dependencies:
//   npm install @emoji-mart/react @emoji-mart/data

import { useEffect, useRef } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface EmojiData {
  id: string;
  name: string;
  native: string;
  unified: string;
  keywords: string[];
  shortcodes: string;
}

interface EmojiPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  // Position anchor - popover appears above/below this point
  anchorPosition?: { x: number; y: number };
}

export function EmojiPickerPopover({ 
  isOpen, 
  onClose, 
  onSelect,
  anchorPosition 
}: EmojiPickerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Handle emoji selection
  const handleEmojiSelect = (emoji: EmojiData) => {
    onSelect(emoji.native);
    onClose();
  };

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      ref={popoverRef}
      className="absolute bottom-full left-0 mb-2 z-50"
      style={anchorPosition ? {
        position: 'fixed',
        left: anchorPosition.x,
        bottom: `calc(100vh - ${anchorPosition.y}px + 8px)`
      } : undefined}
    >
      <div className="rounded-xl overflow-hidden shadow-2xl border border-zinc-700/50">
        <Picker
          data={data}
          onEmojiSelect={handleEmojiSelect}
          theme="dark"
          set="native"
          skinTonePosition="search"
          previewPosition="none"
          maxFrequentRows={2}
          navPosition="bottom"
          perLine={8}
          emojiSize={24}
          emojiButtonSize={32}
          categories={[
            'frequent',
            'people',
            'nature',
            'foods',
            'activity',
            'places',
            'objects',
            'symbols',
            'flags'
          ]}
          // Custom styling to match Outpost theme
          style={{
            '--em-rgb-background': '45, 45, 45',
            '--em-rgb-input': '63, 63, 70',
            '--em-rgb-color': '255, 255, 255',
            '--em-rgb-accent': '247, 172, 92',
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
}