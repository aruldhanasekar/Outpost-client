import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { getIdToken } from "@/services/auth.service";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const Index = () => {
  const { currentUser, loading, backendUserData } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasCheckedAuth = useRef(false);

  const [showModal, setShowModal] = useState(false);
  const [currentSentence, setCurrentSentence] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Auth Modal States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMethod, setAuthMethod] = useState<'direct' | 'composio' | null>(null);
  const [composioStep1Complete, setComposioStep1Complete] = useState(false);
  const [composioUserEmail, setComposioUserEmail] = useState<string>("");
  const [isLoadingDirect, setIsLoadingDirect] = useState(false);
  const [isLoadingComposio, setIsLoadingComposio] = useState(false);

  const sentences = [
    "Outpost is an AI inbox that helps you focus on what matters most and keeps track of promises you've made and replies you're waiting for.",
    "You can track the promises you make via email to investors, customers, or your team.",
    "Stop forgetting replies you're waiting for. Your inbox keeps track for you.",
  ];

  // Looping animation for sentences
  useEffect(() => {
    const displayDuration = 8000;
    const fadeOutDuration = 500;

    const timer = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSentence((prev) => (prev + 1) % 3);
        setIsTransitioning(false);
      }, fadeOutDuration);
    }, displayDuration + fadeOutDuration);

    return () => clearInterval(timer);
  }, []);

  // Modal body scroll lock
  useEffect(() => {
    if (showModal || showAuthModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showModal, showAuthModal]);

  // Check for OAuth errors in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const message = urlParams.get('message');
    
    if (error) {
      console.error('❌ OAuth error:', error, message);
      setErrorMessage(message || 'Authentication failed. Please try again.');
      window.history.replaceState({}, '', '/');
    }
  }, []);


  // Redirect authenticated users to inbox
  useEffect(() => {
    if (loading) return;

    if (currentUser && !hasCheckedAuth.current) {
      
      console.log("✅ User authenticated:", currentUser.uid.slice(0, 8), "→ Redirecting to inbox");
      hasCheckedAuth.current = true;
      navigate("/inbox", { replace: true });
    } else if (!currentUser) {
      console.log("👤 No user signed in - showing login page");
      hasCheckedAuth.current = false;
    }
  }, [currentUser, loading, navigate]);

  // Open auth modal
  const handleOpenAuthModal = () => {
    setShowAuthModal(true);
    setComposioStep1Complete(false);
  };

  // Handle Direct Login (existing flow)
  const handleDirectLogin = async () => {
    try {
      setAuthMethod('direct');
      setIsLoadingDirect(true);
      setErrorMessage(null);
      
      console.log("🔐 Starting Direct Login...");
      
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        `${BACKEND_URL}/auth/gmail/login`,
        'gmail-oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      if (!popup) {
        throw new Error('Popup was blocked. Please allow popups for this site.');
      }
      
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          console.log("👍 Popup closed");
          clearInterval(checkClosed);
          setIsLoadingDirect(false);
          setShowAuthModal(false); // Close modal on completion
        }
      }, 500);
      
    } catch (error: any) {
      console.error("❌ Direct login failed:", error);
      setErrorMessage(error.message || "Failed to sign in. Please try again.");
      setIsLoadingDirect(false);
    }
  };

  // Handle Composio Step 1 (Firebase Identity OAuth)
  const handleComposioStep1 = async () => {
    try {
      setAuthMethod('composio');
      setIsLoadingComposio(true);
      setErrorMessage(null);
      
      console.log("🔵 Starting Composio Step 1 (Firebase Identity OAuth)...");
      
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
          setIsLoadingComposio(false);
          // Don't close modal - wait for Step 1 completion
        }
      }, 500);
      
    } catch (error: any) {
      console.error("❌ Composio Step 1 failed:", error);
      setErrorMessage(error.message || "Failed to sign in. Please try again.");
      setIsLoadingComposio(false);
    }
  };

  // Handle Composio Step 2 (Connect Gmail)
  const handleComposioStep2 = async () => {
    try {
      setIsLoadingComposio(true);
      setErrorMessage(null);
      
      console.log("🔵 Starting Composio Step 2 (Connect Gmail)...");
      
      // Get Firebase ID token
      const idToken = await getIdToken();
      
      if (!idToken) {
        throw new Error('Authentication token not found. Please try again.');
      }
      
      // Call backend to create Composio connection
      const response = await fetch(`${BACKEND_URL}/auth/composio/connect`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to create Composio connection');
      }
      
      const data = await response.json();
      const { redirect_url } = data;
      
      console.log("🔵 Opening Composio OAuth popup...");
      
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        redirect_url,
        'composio-oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      if (!popup) {
        throw new Error('Popup was blocked. Please allow popups for this site.');
      }
      
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          console.log("👍 Composio popup closed");
          clearInterval(checkClosed);
          setIsLoadingComposio(false);
          setShowAuthModal(false); // Close modal
          // User will be redirected by Composio callback
        }
      }, 500);
      
    } catch (error: any) {
      console.error("❌ Composio Step 2 failed:", error);
      setErrorMessage(error.message || "Failed to connect Gmail. Please try again.");
      setIsLoadingComposio(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect in progress
  if (currentUser && backendUserData?.auth_method !== 'composio') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-white flex flex-col items-center justify-center px-8">
      {/* Error Toast */}
      {errorMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-red-500/90 backdrop-blur-sm text-white px-5 py-3 rounded-lg flex items-center gap-3">
            <span className="text-lg">⚠️</span>
            <p className="text-sm">{errorMessage}</p>
            <button 
              onClick={() => setErrorMessage(null)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Header */}
      <header className="fixed top-0 left-0 right-0 z-40">
        <div className="px-6 lg:px-12 py-5">
          <div className="flex items-center justify-between">
            {/* Logo - Left */}
            <div className="flex items-center">
              <span 
                className="text-[1.35rem] font-semibold tracking-tight text-black"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Outpost
              </span>
            </div>

            {/* Start Now Button - Right */}
            <button
              onClick={handleOpenAuthModal}
              disabled={isLoading}
              className="flex items-center gap-2.5 px-5 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              <span>{isLoading ? "Connecting..." : "Start Now"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <h1 
        className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-black text-center mb-4"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        {["Stay", "clear", "on", "what", "matters", "most", "in", "email"].map((word, index) => (
          <span
            key={index}
            className="inline-block mx-1 opacity-0 animate-fade-in-word"
            style={{ animationDelay: `${index * 0.15}s`, animationFillMode: "forwards" }}
          >
            {word}
          </span>
        ))}
      </h1>

      {/* Animated Sentences */}
      <div className="max-w-3xl mx-auto mb-16 h-[120px] flex items-start justify-center">
        <p
          className={`text-xl md:text-2xl lg:text-3xl text-gray-500 text-center transition-opacity duration-500 ${
            isTransitioning ? "opacity-0" : "opacity-100"
          }`}
          style={{ fontFamily: "'Noticia Text', serif" }}
        >
          {sentences[currentSentence].split(" ").map((word, index) => (
            <span
              key={`${currentSentence}-${index}`}
              className="inline-block mx-1 opacity-0 animate-fade-in-word"
              style={{ animationDelay: `${index * 0.1}s`, animationFillMode: "forwards" }}
            >
              {word}
            </span>
          ))}
        </p>
      </div>

      {/* Footer - Privacy Policy & Terms */}
      <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <a 
          href="/privacy"
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          Privacy Policy
        </a>
        <span className="text-gray-300">•</span>
        <a 
          href="/terms"
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          Terms of Use
        </a>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !composioStep1Complete && setShowAuthModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 
                className="text-xl font-semibold text-black"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                {composioStep1Complete ? "Connect Your Gmail" : "Choose sign-in method"}
              </h2>
              {!composioStep1Complete && (
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5 text-black" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="px-6 py-6">
              {composioStep1Complete ? (
                // Composio Step 2: Connect Gmail
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 text-green-600 mb-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium">Signed in as {composioUserEmail}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Now connect your Gmail to continue
                    </p>
                  </div>

                  <button
                    onClick={handleComposioStep2}
                    disabled={isLoadingComposio}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingComposio ? (
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#EA4335" d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z"/>
                          <path fill="#34A853" d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2936293 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z"/>
                          <path fill="#4A90E2" d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5818182 23.1818182,9.90909091 L12,9.90909091 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z"/>
                          <path fill="#FBBC05" d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z"/>
                        </svg>
                        <span className="font-medium text-gray-700">
                          {isLoadingComposio ? "Connecting..." : "Connect Gmail with Composio"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                // Initial: Two identical Google buttons
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 text-center mb-4">
                    Select how you'd like to sign in
                  </p>

                  {/* Direct Login Button */}
                  <div className="group relative">
                    <button
                      onClick={handleDirectLogin}
                      disabled={isLoadingDirect || isLoadingComposio}
                      className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Fast setup • May show unverified warning"
                    >
                      {isLoadingDirect ? (
                        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
                      ) : (
                        <>
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          <span className="font-medium text-gray-700">Sign in with Google</span>
                        </>
                      )}
                    </button>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      Fast setup • May show unverified warning
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>

                  {/* Composio Login Button */}
                  <div className="group relative">
                    <button
                      onClick={handleComposioStep1}
                      disabled={isLoadingDirect || isLoadingComposio}
                      className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Verified OAuth • No warnings • Recommended"
                    >
                      {isLoadingComposio ? (
                        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
                      ) : (
                        <>
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          <span className="font-medium text-gray-700">Sign in with Google</span>
                        </>
                      )}
                    </button>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      Verified OAuth • No warnings • Recommended
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    Hover over buttons for details
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* About Modal - Keep existing */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 md:p-8"
          onClick={() => setShowModal(false)}
        >
          {/* ... existing modal content ... */}
        </div>
      )}
    </div>
  );
};

export default Index;