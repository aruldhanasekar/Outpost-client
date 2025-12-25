// components/labels/CreateLabelModal.tsx
// Empty modal for creating labels - dark theme, fade in animation

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface CreateLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateLabelModal({ isOpen, onClose }: CreateLabelModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle open/close with animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Small delay to trigger fade in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      // Wait for fade out before hiding
      const timeout = setTimeout(() => {
        setIsVisible(false);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay - click to close */}
      <div 
        className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={`relative bg-[#2d2d2d] rounded-2xl shadow-2xl w-[400px] min-h-[200px] transition-all duration-200 ${
          isAnimating 
            ? 'opacity-100 scale-100' 
            : 'opacity-0 scale-95'
        }`}
      >
        {/* X Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700/50 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* Empty content - to be filled later */}
        <div className="p-6">
          {/* Placeholder */}
        </div>
      </div>
    </div>
  );
}

export default CreateLabelModal;