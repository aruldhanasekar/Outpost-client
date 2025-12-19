// TrackingIndicator.tsx - Shows tracking status for sent emails in inbox threads
// Desktop: Hover to show tooltip
// Mobile: Tap to show modal

import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, X, Loader2 } from 'lucide-react';
import { formatRelativeTime } from '@/utils/formatters';


interface TrackingStatus {
  opened: boolean;
  recipient_open_count: number;
  first_opened_at: string | null;
  last_opened_at: string | null;
  click_count: number;
}

interface TrackingIndicatorProps {
  messageId: string;
  isMobile?: boolean;
  getAuthToken: () => Promise<string>; // Function to get Firebase ID token
}

export function TrackingIndicator({ messageId, isMobile = false, getAuthToken }: TrackingIndicatorProps) {
  const [tracking, setTracking] = useState<TrackingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hasFetched = useRef(false);

  // Fetch tracking data
  const fetchTracking = async () => {
    if (!messageId || hasFetched.current) return;
    
    setLoading(true);
    setError(false);
    hasFetched.current = true;

    try {
      const token = await getAuthToken();
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/emails/tracking/by-message/${messageId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data) {
          setTracking({
            opened: data.opened || false,
            recipient_open_count: data.recipient_open_count || 0,
            first_opened_at: data.first_opened_at || null,
            last_opened_at: data.last_opened_at || null,
            click_count: data.click_count || 0,
          });
        }
      } else if (response.status === 404) {
        // No tracking data - this email wasn't sent via Outpost
        setTracking(null);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Error fetching tracking:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId]);

  // Don't render if no tracking data available (email not sent via Outpost)
  if (!loading && tracking === null) {
    return null;
  }

  // Desktop tooltip content
  const TooltipContent = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Loading...</span>
        </div>
      );
    }

    if (error || !tracking) {
      return <span className="text-zinc-500">Unable to load tracking</span>;
    }

    if (tracking.opened) {
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Eye className="w-3.5 h-3.5" />
            <span className="font-medium">Opened</span>
            {tracking.recipient_open_count > 1 && (
              <span className="text-zinc-400">× {tracking.recipient_open_count}</span>
            )}
          </div>
          {tracking.last_opened_at && (
            <p className="text-xs text-zinc-500">
              {formatRelativeTime(tracking.last_opened_at)}
            </p>
          )}
          {tracking.click_count > 0 && (
            <p className="text-xs text-zinc-400">
              {tracking.click_count} link click{tracking.click_count > 1 ? 's' : ''}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 text-zinc-500">
        <EyeOff className="w-3.5 h-3.5" />
        <span>Not opened yet</span>
      </div>
    );
  };

  // Mobile modal content
  const ModalContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
        </div>
      );
    }

    if (error || !tracking) {
      return (
        <div className="text-center py-6">
          <p className="text-zinc-500">Unable to load tracking data</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-center gap-2">
          {tracking.opened ? (
            <>
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Eye className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-white">Opened</p>
                <p className="text-sm text-zinc-400">
                  {tracking.recipient_open_count} time{tracking.recipient_open_count > 1 ? 's' : ''}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                <EyeOff className="w-5 h-5 text-zinc-500" />
              </div>
              <div>
                <p className="text-lg font-medium text-white">Not opened</p>
                <p className="text-sm text-zinc-500">Waiting for recipient</p>
              </div>
            </>
          )}
        </div>

        {/* Details */}
        {tracking.opened && (
          <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
            {tracking.first_opened_at && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">First opened</span>
                <span className="text-zinc-300">{formatRelativeTime(tracking.first_opened_at)}</span>
              </div>
            )}
            {tracking.last_opened_at && tracking.recipient_open_count > 1 && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Last opened</span>
                <span className="text-zinc-300">{formatRelativeTime(tracking.last_opened_at)}</span>
              </div>
            )}
            {tracking.click_count > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Link clicks</span>
                <span className="text-zinc-300">{tracking.click_count}</span>
              </div>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-zinc-600 text-center">
          Tracking accuracy ~60-70%. Some clients block pixels.
        </p>
      </div>
    );
  };

  // Determine icon color based on tracking status
  const getIconColor = () => {
    if (loading) return 'text-zinc-500';
    if (tracking?.opened) return 'text-emerald-400';
    return 'text-zinc-500';
  };

  // Mobile version with tap modal
  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={`p-1 rounded transition-colors ${getIconColor()} hover:bg-zinc-700/50`}
          title="View tracking status"
        >
          {tracking?.opened ? (
            <Eye className="w-3.5 h-3.5" />
          ) : (
            <EyeOff className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Modal */}
        {showModal && (
          <div 
            className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
            onClick={() => setShowModal(false)}
          >
            <div 
              className="bg-zinc-900 w-full max-w-lg rounded-t-2xl p-5 pb-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Email Tracking</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <ModalContent />
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop version with hover tooltip
  return (
    <div className="relative inline-flex">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`p-1 rounded transition-colors ${getIconColor()} hover:bg-zinc-200/50`}
        title="View tracking status"
      >
        {tracking?.opened ? (
          <Eye className="w-3.5 h-3.5" />
        ) : (
          <EyeOff className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div 
          ref={tooltipRef}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50"
        >
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-lg min-w-[140px]">
            <TooltipContent />
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="border-4 border-transparent border-t-zinc-700" />
          </div>
        </div>
      )}
    </div>
  );
}