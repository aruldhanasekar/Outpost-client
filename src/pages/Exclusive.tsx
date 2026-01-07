// Exclusive.tsx - VIP Authentication page for selected users
// This link is shared manually with limited users only

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function ExclusivePage() {
  const { currentUser, loading, backendUserData } = useAuth();
  const navigate = useNavigate();
  const hasCheckedAuth = useRef(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect authenticated users to inbox
  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      hasCheckedAuth.current = false;
      return;
    }

    // Wait for backendUserData to load
    if (backendUserData === undefined) return;

    if (hasCheckedAuth.current) return;

    // Direct auth users: redirect to inbox
    if (backendUserData?.auth_method === 'direct') {
      console.log("✅ Direct auth user → Redirecting to inbox");
      hasCheckedAuth.current = true;
      navigate("/inbox", { replace: true });
      return;
    }

    // Composio users with connection: redirect to inbox
    if (backendUserData?.auth_method === 'composio' && backendUserData?.composio_connection_id) {
      console.log("✅ Composio user fully onboarded → Redirecting to inbox");
      hasCheckedAuth.current = true;
      navigate("/inbox", { replace: true });
      return;
    }

    // Composio user without connection but paid: redirect to inbox (will show connection overlay)
    if (backendUserData?.auth_method === 'composio' && backendUserData?.paid === true) {
      console.log("✅ Composio user paid → Redirecting to inbox");
      hasCheckedAuth.current = true;
      navigate("/inbox", { replace: true });
      return;
    }

  }, [currentUser, loading, navigate, backendUserData]);

  // Handle Composio Sign In (Firebase Identity OAuth)
  const handleComposioSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("🔵 Starting Composio Sign In (Firebase Identity OAuth)...");

      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        `${BACKEND_URL}/auth/firebase/login`,
        'firebase-oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        throw new Error('Popup was blocked. Please allow popups for this site.');
      }

      const checkClosed = setInterval(() => {
        if (popup.closed) {
          console.log("👍 Popup closed");
          clearInterval(checkClosed);
          setIsLoading(false);
        }
      }, 500);

    } catch (err: any) {
      console.error("❌ Composio Sign In failed:", err);
      setError(err.message || "Failed to sign in. Please try again.");
      setIsLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Content Container */}
        <div className="text-center">
          {/* Heading */}
          <h1 
            className="text-3xl md:text-4xl font-bold text-zinc-900 mb-3"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Welcome to Outpost
          </h1>
          
          {/* Subtext */}
          <p className="text-zinc-600 text-lg mb-10">
            You've been granted early access
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Sign In Button */}
          <button
            onClick={handleComposioSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 border-2 border-zinc-300 rounded-xl hover:bg-zinc-50 hover:border-zinc-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
            ) : (
              <>
                {/* Google Icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="font-medium text-zinc-700" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Sign in with Google
                </span>
              </>
            )}
          </button>

          {/* No Credit Card Message */}
          <p className="mt-6 text-zinc-500 text-sm">
            No credit card needed
          </p>
        </div>
      </div>
    </div>
  );
}