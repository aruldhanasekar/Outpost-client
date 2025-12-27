// components/ui/CategoryMoveToast.tsx
// Toast notification when emails are moved to Promises or Awaiting categories
// v1.0: Initial implementation with slide-in animation from top

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export interface CategoryMoveNotification {
  id: string;
  type: 'promise' | 'awaiting';
  subject: string;
  timestamp: number;
}

interface CategoryMoveToastProps {
  notifications: CategoryMoveNotification[];
  onDismiss: (id: string) => void;
  autoHideDuration?: number;
}

// Single toast item component
const ToastItem = ({ 
  notification, 
  onDismiss,
  autoHideDuration = 3000
}: { 
  notification: CategoryMoveNotification; 
  onDismiss: (id: string) => void;
  autoHideDuration?: number;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setIsVisible(true), 10);
    
    // Auto dismiss after duration
    const dismissTimer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(notification.id), 300);
    }, autoHideDuration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(dismissTimer);
    };
  }, [notification.id, onDismiss, autoHideDuration]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(notification.id), 300);
  };

  const label = notification.type === 'promise' ? 'Promises' : 'Awaiting';
  const icon = notification.type === 'promise' ? '📋' : '⏳';

  return (
    <div
      className={`
        w-full max-w-sm bg-[#1a1a1a] border border-zinc-700/50 rounded-xl shadow-lg
        transform transition-all duration-300 ease-out
        ${isVisible && !isExiting ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}
      `}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Icon */}
        <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium">
            Email moved to {label}
          </p>
          <p className="text-xs text-zinc-400 truncate mt-0.5">
            {notification.subject || '(No Subject)'}
          </p>
        </div>
        
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-700/50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Main toast container component
export const CategoryMoveToast = ({ 
  notifications, 
  onDismiss,
  autoHideDuration = 3000
}: CategoryMoveToastProps) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <ToastItem
            notification={notification}
            onDismiss={onDismiss}
            autoHideDuration={autoHideDuration}
          />
        </div>
      ))}
    </div>
  );
};

export default CategoryMoveToast;