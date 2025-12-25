// components/labels/DeleteLabelModal.tsx
// Alert modal for confirming label deletion - dark theme, glass effect buttons

import { useEffect, useState } from 'react';

interface DeleteLabelModalProps {
  isOpen: boolean;
  labelName: string;
  labelId: string;
  onClose: () => void;
  onConfirm: (labelId: string) => void;
  isDeleting?: boolean;
}

export function DeleteLabelModal({ 
  isOpen, 
  labelName, 
  labelId,
  onClose, 
  onConfirm,
  isDeleting = false
}: DeleteLabelModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle open/close with animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      const timeout = setTimeout(() => {
        setIsVisible(false);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, isDeleting]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Overlay - click to close */}
      <div 
        className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => !isDeleting && onClose()}
      />
      
      {/* Modal */}
      <div 
        className={`relative bg-[#2d2d2d] rounded-2xl shadow-2xl w-[360px] transition-all duration-200 ${
          isAnimating 
            ? 'opacity-100 scale-100' 
            : 'opacity-0 scale-95'
        }`}
      >
        {/* Content */}
        <div className="p-6">
          {/* Title */}
          <h3 className="text-lg font-semibold text-white mb-2">
            Delete "{labelName}" label?
          </h3>
          
          {/* Description */}
          <p className="text-sm text-zinc-400 mb-6">
            This will remove the label from Gmail. Emails won't be deleted.
          </p>
          
          {/* Buttons */}
          <div className="flex gap-3">
            {/* Cancel Button - Glass effect */}
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 py-2.5 rounded-xl font-medium text-white bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            
            {/* Delete Button - Teal with glass effect */}
            <button
              onClick={() => onConfirm(labelId)}
              disabled={isDeleting}
              className="flex-1 py-2.5 rounded-xl font-medium text-white bg-[#8FA8A3]/80 backdrop-blur-sm border border-[#8FA8A3]/30 hover:bg-[#8FA8A3] transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeleteLabelModal;