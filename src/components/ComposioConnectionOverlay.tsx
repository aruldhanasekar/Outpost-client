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

  // Main overlay with "Connect Gmail" prompt
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h2
            className="text-2xl font-semibold text-black"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            📧 Connect Your Gmail
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          {/* Success - Signed In */}
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <svg
              className="w-5 h-5 text-green-600 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">Signed in as</p>
              <p className="text-sm text-green-700">{userEmail}</p>
            </div>
          </div>

          {/* Instruction */}
          <div className="text-center py-2">
            <p className="text-gray-700 leading-relaxed">
              To use Outpost, you need to connect your Gmail account through our
              verified OAuth provider.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <div className="flex items-start gap-2">
                <span className="text-red-600">⚠️</span>
                <p className="text-sm text-red-800">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Connect Button */}
          <button
            onClick={handleConnectGmail}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z"
              />
              <path
                fill="#34A853"
                d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2936293 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z"
              />
              <path
                fill="#4A90E2"
                d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5818182 23.1818182,9.90909091 L12,9.90909091 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z"
              />
              <path
                fill="#FBBC05"
                d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z"
              />
            </svg>
            <span>Connect Gmail with Composio</span>
          </button>

          {/* Info */}
          <div className="text-center pt-2">
            <p className="text-xs text-gray-500">
              ✅ Verified OAuth • No "unverified app" warning
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComposioConnectionOverlay;