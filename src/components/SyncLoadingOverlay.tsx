import { useEffect, useState } from "react";

interface SyncLoadingOverlayProps {
  onHide?: () => void;
}

const SyncLoadingOverlay = ({ onHide }: SyncLoadingOverlayProps) => {
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    // Auto-hide after 10 seconds
    const hideTimer = setTimeout(() => {
      console.log("⏱️ 10 seconds elapsed - hiding sync overlay");
      onHide?.();
    }, 10000);

    // Countdown timer (for display)
    const countdownInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(hideTimer);
      clearInterval(countdownInterval);
    };
  }, [onHide]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 bg-white px-16 py-10 rounded-2xl shadow-2xl">
        {/* Spinning Circle */}
        <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />

        {/* Loading Text */}
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-800 mb-1">
            Syncing your emails...
          </p>
          <p className="text-sm text-gray-500">
            Emails will appear as they're processed
          </p>
        </div>

        {/* Countdown (subtle) */}
        {timeLeft > 0 && (
          <p className="text-xs text-gray-400">
            Auto-hiding in {timeLeft}s
          </p>
        )}
      </div>
    </div>
  );
};

export default SyncLoadingOverlay;