// components/inbox/EmailSendUndoToast.tsx
// Undo toast specifically for email sending (8 second window)
// Different from the delete UndoToast in components/ui/

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cancelEmail } from '@/services/emailApi';

interface EmailSendUndoToastProps {
  emailId: string;
  recipients: string[];
  onClose: () => void;
  onUndo: () => void;
  undoWindowSeconds?: number;
}

type ToastState = 'countdown' | 'cancelling' | 'cancelled' | 'sent' | 'error';

export function EmailSendUndoToast({ 
  emailId, 
  recipients, 
  onClose, 
  onUndo,
  undoWindowSeconds = 8 
}: EmailSendUndoToastProps) {
  const [state, setState] = useState<ToastState>('countdown');
  const [progress, setProgress] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(undoWindowSeconds * 1000);
  
  // Countdown timer with pause support
  useEffect(() => {
    if (state !== 'countdown') return;
    if (isPaused) return;
    
    // Record start time when unpaused
    startTimeRef.current = Date.now();
    
    const timer = setTimeout(() => {
      setState('sent');
      // Auto close after showing "Sent" for 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    }, remainingTimeRef.current);
    
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = remainingTimeRef.current - elapsed;
      const newProgress = (remaining / (undoWindowSeconds * 1000)) * 100;
      setProgress(Math.max(0, newProgress));
    }, 50);
    
    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
      // Save remaining time when paused
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    };
  }, [state, isPaused, undoWindowSeconds, onClose]);
  
  // Handle undo click
  const handleUndo = useCallback(async () => {
    if (state !== 'countdown') return;
    
    setState('cancelling');
    
    try {
      await cancelEmail(emailId);
      setState('cancelled');
      onUndo();
      
      // Auto close after showing "Cancelled" for 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Failed to cancel email:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel');
      setState('error');
      
      // Auto close after showing error for 3 seconds
      setTimeout(() => {
        onClose();
      }, 3000);
    }
  }, [emailId, state, onClose, onUndo]);
  
  // Format recipients for display
  const recipientDisplay = recipients.length === 1 
    ? recipients[0] 
    : `${recipients[0]} +${recipients.length - 1}`;
  
  // Time left in seconds for display
  const timeLeft = Math.ceil((progress / 100) * undoWindowSeconds);
  
  return (
    <div
      className="fixed bottom-6 right-6 z-[100] animate-slideInRight"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden min-w-[320px] max-w-[400px]">
        {/* Content */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            {state === 'countdown' && (
              <Mail className="w-5 h-5 text-[#f7ac5c]" />
            )}
            {state === 'cancelling' && (
              <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
            )}
            {state === 'cancelled' && (
              <XCircle className="w-5 h-5 text-yellow-500" />
            )}
            {state === 'sent' && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            {state === 'error' && (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
          
          {/* Text */}
          <div className="flex-1 min-w-0">
            {state === 'countdown' && (
              <>
                <p className="text-sm text-white font-medium">
                  Sending email...
                </p>
                <p className="text-xs text-zinc-400 truncate">
                  To: {recipientDisplay}
                </p>
              </>
            )}
            {state === 'cancelling' && (
              <p className="text-sm text-white">
                Cancelling...
              </p>
            )}
            {state === 'cancelled' && (
              <>
                <p className="text-sm text-white font-medium">
                  Email cancelled
                </p>
                <p className="text-xs text-zinc-400">
                  Message was not sent
                </p>
              </>
            )}
            {state === 'sent' && (
              <>
                <p className="text-sm text-white font-medium">
                  Email sent
                </p>
                <p className="text-xs text-zinc-400 truncate">
                  To: {recipientDisplay}
                </p>
              </>
            )}
            {state === 'error' && (
              <>
                <p className="text-sm text-white font-medium">
                  Couldn't cancel
                </p>
                <p className="text-xs text-red-400">
                  {error || 'Email may have already been sent'}
                </p>
              </>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {state === 'countdown' && (
              <>
                <button
                  onClick={handleUndo}
                  className="px-3 py-1.5 bg-[#f7ac5c] hover:bg-[#f5a043] text-black text-sm font-medium rounded transition-colors"
                >
                  Undo
                </button>
                <span className="text-xs text-zinc-500 w-5 text-right">
                  {timeLeft}s
                </span>
              </>
            )}
            
            {/* Close button (except during cancelling) */}
            {state !== 'cancelling' && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-zinc-700 rounded transition-colors text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Progress bar (only during countdown) */}
        {state === 'countdown' && (
          <div className="h-1 bg-zinc-700">
            <div
              className="h-full bg-[#f7ac5c] transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
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