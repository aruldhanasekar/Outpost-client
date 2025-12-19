// TrackingPanel.tsx - Display email tracking statistics
// Shows: Opened status, First opened time, Last opened time

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Clock, Loader2, Mail } from 'lucide-react';
import { getTrackingByMessageId, TrackingStats } from '@/services/trackingApi';

interface TrackingPanelProps {
  gmailMessageId: string | undefined;
  threadEmailCount: number;
  recipient: string;
}

export function TrackingPanel({ gmailMessageId, threadEmailCount, recipient }: TrackingPanelProps) {
  const [tracking, setTracking] = useState<TrackingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gmailMessageId) {
      setTracking(null);
      return;
    }

    console.log('🔍 TrackingPanel looking up:', gmailMessageId);

    const fetchTracking = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await getTrackingByMessageId(gmailMessageId);
        console.log('📊 Tracking result:', data);
        setTracking(data);
      } catch (err) {
        console.error('Failed to fetch tracking:', err);
        setError('Failed to load tracking');
      } finally {
        setLoading(false);
      }
    };

    fetchTracking();
  }, [gmailMessageId]);

  // Format date for display
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get the correct open count
  const getOpenCount = (): number => {
    if (!tracking) return 0;
    return tracking.recipient_open_count ?? tracking.open_count ?? 0;
  };

  // Check if email was opened by recipient
  const isOpened = (): boolean => {
    if (!tracking) return false;
    return getOpenCount() > 0;
  };

  return (
    <div className="h-full flex flex-col p-6 pt-8">
      {/* Top Section */}
      <div className="space-y-6">
        {/* Thread Info */}
        <div>
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Thread</p>
          <p className="text-zinc-300 text-sm">{threadEmailCount} email{threadEmailCount !== 1 ? 's' : ''}</p>
        </div>

        {/* Recipient */}
        <div>
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">To</p>
          <p className="text-zinc-400 text-xs truncate">{recipient}</p>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Status Section - Bottom */}
      <div className="pb-4">
        <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">Status</p>
        
        {loading ? (
          <div className="flex items-center gap-2 text-zinc-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Loading...</span>
          </div>
        ) : error ? (
          <p className="text-xs text-red-400">{error}</p>
        ) : !tracking ? (
          <div className="flex items-center gap-2 text-zinc-500">
            <Mail className="w-4 h-4" />
            <span className="text-xs">No tracking available</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Opened Status */}
            <div className="flex items-center gap-3">
              {isOpened() ? (
                <>
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Eye className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">Opened</p>
                    <p className="text-xs text-zinc-500">
                      {getOpenCount()} time{getOpenCount() !== 1 ? 's' : ''}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2 bg-zinc-700/50 rounded-lg">
                    <EyeOff className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Not opened yet</p>
                  </div>
                </>
              )}
            </div>

            {/* First Opened Time */}
            {isOpened() && tracking.first_opened_at && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-700/50 rounded-lg">
                  <Clock className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">First opened</p>
                  <p className="text-sm text-zinc-300">{formatDate(tracking.first_opened_at)}</p>
                </div>
              </div>
            )}

            {/* Last Opened Time */}
            {isOpened() && tracking.last_opened_at && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-700/50 rounded-lg">
                  <Clock className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Last opened</p>
                  <p className="text-sm text-zinc-300">{formatDate(tracking.last_opened_at)}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}