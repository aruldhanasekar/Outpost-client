import { useState } from "react";
import { getIdToken } from "@/services/auth.service";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

interface ComposioConnectionOverlayProps {
  userEmail: string;
  onConnectionComplete?: () => void;
}

const ComposioConnectionOverlay = ({
  userEmail,
  onConnectionComplete,
}: ComposioConnectionOverlayProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConnectGmail = async () => {
    try {
      setIsConnecting(true);
      setErrorMessage(null);

      console.log("🔵 Starting Composio Gmail connection...");

      // Get Firebase ID token
      const idToken = await getIdToken();

      if (!idToken) {
        throw new Error("Authentication token not found. Please sign in again.");
      }

      // Call backend to create Composio connection
      const response = await fetch(`${BACKEND_URL}/auth/composio/connect`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create Composio connection");
      }

      const data = await response.json();
      const { redirect_url } = data;

      console.log("🔵 Redirecting to Composio OAuth...");

      // Full page redirect to Composio OAuth
      window.location.href = redirect_url;
      
    } catch (error: any) {
      console.error("❌ Composio connection failed:", error);
      setErrorMessage(error.message || "Failed to connect Gmail. Please try again.");
      setIsConnecting(false);
    }
  };

  // Loading state (after clicking Connect Gmail)
  if (isConnecting) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4 bg-white px-12 py-8 rounded-2xl shadow-2xl">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-800 mb-1">
              Connecting Gmail...
            </p>
            <p className="text-sm text-gray-500">
              Complete the OAuth in the popup
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main overlay with two-panel design
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex overflow-hidden">
        
        {/* Left Panel - White */}
        <div className="flex-1 p-8">
          {/* Heading */}
          <div className="text-center mb-6">
            <h3 
              className="text-xl font-semibold text-gray-900 mb-2" 
              style={{ fontFamily: "'Google Sans', sans-serif" }}
            >
              Connect your Gmail
            </h3>
            <p 
              className="text-sm text-gray-600" 
              style={{ fontFamily: "'Google Sans', sans-serif" }}
            >
              Signed in as {userEmail}
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm mb-4">
              {errorMessage}
            </div>
          )}

          {/* Connect Gmail Button */}
          <button
            onClick={handleConnectGmail}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span 
                  className="font-medium text-gray-700" 
                  style={{ fontFamily: "'Google Sans', sans-serif" }}
                >
                  Connect Gmail
                </span>
              </>
            )}
          </button>
        </div>

        {/* Right Panel - Dark */}
        <div 
          className="hidden md:flex w-72 bg-black text-white p-8 items-center"
          style={{ fontFamily: "'Google Sans', sans-serif" }}
        >
          <div className="space-y-4">
            <p className="text-sm leading-relaxed">
              Get instant access to Outpost with Composio authentication.
            </p>
            <p className="text-sm leading-relaxed text-gray-400">
              Your OAuth access and limited profile data are securely accessed and managed by <span className="text-white">Composio</span>.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ComposioConnectionOverlay;