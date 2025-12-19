// components/ui/UndoToast.tsx - Undo toast notification for delete actions

import { useEffect, useState, useRef } from 'react';
import { X, Undo2 } from 'lucide-react';

interface UndoToastProps {
  message: string;
  duration?: number; // in milliseconds
  onUndo?: () => void;
  onClose: () => void;
}

export function UndoToast({ message, duration = 3000, onUndo, onClose }: UndoToastProps) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(duration);

  useEffect(() => {
    if (isPaused) return;

    // Record start time when unpaused
    startTimeRef.current = Date.now();

    const timer = setTimeout(() => {
      onClose();
    }, remainingTimeRef.current);

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = remainingTimeRef.current - elapsed;
      const newProgress = (remaining / duration) * 100;
      setProgress(Math.max(0, newProgress));
    }, 50);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
      // Save remaining time when paused
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    };
  }, [duration, onClose, isPaused]);

  const handleUndo = () => {
    if (onUndo) {
      onUndo();
    }
    onClose();
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-[100] animate-slideInRight"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden min-w-[280px]">
        {/* Content */}
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="text-sm text-white">{message}</span>
          <div className="flex items-center gap-2">
            {onUndo && (
              <button
                onClick={handleUndo}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f7ac5c] hover:bg-[#f5a043] text-black text-sm font-medium rounded transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Undo
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-zinc-700 rounded transition-colors text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="h-1 bg-zinc-700">
          <div
            className="h-full bg-[#f7ac5c] transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}