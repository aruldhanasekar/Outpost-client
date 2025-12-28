import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { X } from "lucide-react";
import { getIdToken } from "@/services/auth.service";
import outpostInbox from "@/assets/Outpost inbox.png";
import outpostLogo from "@/assets/Outpost.png";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const Index = () => {
  const { currentUser, loading, backendUserData } = useAuth();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasCheckedAuth = useRef(false);

  // Auth Modal States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistResponse, setWaitlistResponse] = useState<{
    status: string;
    allowed: boolean;
    paid: boolean;
    direct_auth_enabled: boolean;
    message: string;
    price: number | null;
  } | null>(null);
  const [authMethod, setAuthMethod] = useState<'direct' | 'composio' | null>(null);
  const [composioStep1Complete, setComposioStep1Complete] = useState(false);
  const [composioUserEmail, setComposioUserEmail] = useState<string>("");
  const [isLoadingDirect, setIsLoadingDirect] = useState(false);
  const [isLoadingComposio, setIsLoadingComposio] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<'direct' | 'composio' | null>(null);

  // Rotating subheading state
  const [currentSubheadingIndex, setCurrentSubheadingIndex] = useState(0);
  const [subheadingVisible, setSubheadingVisible] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const subheadings = [
    {
      line1: "Inbox clarity. Clear focus.",
      line2: "Always follow through. Stay in control."
    },
    {
      line1: "Be clear on what matters most in your inbox.",
      line2: "That's what Outpost is built for."
    },
    {
      line1: "Track promises you make in emails.",
      line2: "To investors, customers, or your team."
    },
    {
      line1: "Stop forgetting replies you're waiting for.",
      line2: "Your inbox keeps track for you."
    }
  ];

  // Rotating subheading animation
  useEffect(() => {
    // Initial delay before starting animation (wait for headline to finish)
    const initialDelay = setTimeout(() => {
      setSubheadingVisible(true);
    }, 2400);

    return () => clearTimeout(initialDelay);
  }, []);

  useEffect(() => {
    if (!subheadingVisible) return;

    const cycleInterval = setInterval(() => {
      // Start fade out
      setIsFadingOut(true);
      
      // After fade out completes, change content and fade in
      setTimeout(() => {
        setCurrentSubheadingIndex((prev) => (prev + 1) % subheadings.length);
        setAnimationKey(prev => prev + 1);
        setIsFadingOut(false);
      }, 800);
    }, 6000);

    return () => clearInterval(cycleInterval);
  }, [subheadingVisible]);

  // Header and Footer visibility on scroll (desktop only)
  const [headerVisible, setHeaderVisible] = useState(true);
  const [footerVisible, setFooterVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const footerRef = useRef<HTMLElement>(null);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setHeaderVisible(true);
        setFooterVisible(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      // Skip animation logic on mobile
      if (isMobile) {
        setHeaderVisible(true);
        setFooterVisible(true);
        return;
      }

      if (footerRef.current) {
        const rect = footerRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        // Footer is in view when its top is within the viewport
        const isFooterInView = rect.top < windowHeight - 100;
        
        if (isFooterInView) {
          setFooterVisible(true);
          setHeaderVisible(false);
        } else {
          setFooterVisible(false);
          setHeaderVisible(true);
        }
      }
    };

    // Add listeners to all possible scroll containers
    window.addEventListener('scroll', handleScroll, true);
    document.addEventListener('scroll', handleScroll, true);
    document.documentElement.addEventListener('scroll', handleScroll, true);
    
    // Also check on interval as fallback
    const interval = setInterval(handleScroll, 100);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('scroll', handleScroll, true);
      document.documentElement.removeEventListener('scroll', handleScroll, true);
      clearInterval(interval);
    };
  }, [isMobile]);

  // Enable scrolling for landing page (override global overflow:hidden)
  useEffect(() => {
    document.documentElement.style.setProperty('overflow-y', 'auto', 'important');
    document.documentElement.style.setProperty('overflow-x', 'hidden', 'important');
    document.documentElement.style.setProperty('height', 'auto', 'important');
    document.documentElement.style.setProperty('min-height', '0', 'important');
    document.documentElement.style.setProperty('margin', '0', 'important');
    document.documentElement.style.setProperty('padding', '0', 'important');
    document.body.style.setProperty('overflow', 'visible', 'important');
    document.body.style.setProperty('height', 'auto', 'important');
    document.body.style.setProperty('min-height', '0', 'important');
    document.body.style.setProperty('margin', '0', 'important');
    document.body.style.setProperty('padding', '0', 'important');
    const root = document.getElementById('root');
    if (root) {
      root.style.setProperty('overflow', 'visible', 'important');
      root.style.setProperty('height', 'auto', 'important');
      root.style.setProperty('min-height', '0', 'important');
      root.style.setProperty('margin', '0', 'important');
      root.style.setProperty('padding', '0', 'important');
    }
    
    return () => {
      document.documentElement.style.setProperty('overflow', 'hidden', 'important');
      document.documentElement.style.setProperty('height', '100%', 'important');
      document.body.style.setProperty('overflow', 'hidden', 'important');
      document.body.style.setProperty('height', '100%', 'important');
      if (root) {
        root.style.setProperty('overflow', 'hidden', 'important');
        root.style.setProperty('height', '100%', 'important');
      }
    };
  }, []);

  // Modal body scroll lock
  useEffect(() => {
    if (showAuthModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showAuthModal]);

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

  // ============================================================
  // GOOGLE AUTH LOGIC
  // ============================================================
  
  // Handle Direct Login
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
          setShowAuthModal(false);
        }
      }, 500);
      
    } catch (error: any) {
      console.error("❌ Direct login failed:", error);
      setErrorMessage(error.message || "Failed to sign in. Please try again.");
      setIsLoadingDirect(false);
    }
  };

  // Handle waitlist signup
  const handleWaitlistSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail || waitlistLoading) return;
    
    setWaitlistLoading(true);
    setErrorMessage(null);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/waitlist/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: waitlistEmail }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to check waitlist");
      }
      
      const data = await response.json();
      console.log("Waitlist response:", data);
      
      setWaitlistResponse(data);
      setWaitlistEmail("");
      
      // MODAL DISABLED FOR NOW - Just show success message
      // setShowAuthModal(true);
      
    } catch (error: any) {
      console.error("Waitlist signup failed:", error);
      setErrorMessage(error.message || "Failed to join waitlist. Please try again.");
    } finally {
      setWaitlistLoading(false);
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
      
      const idToken = await getIdToken();
      
      if (!idToken) {
        throw new Error('Authentication token not found. Please try again.');
      }
      
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
          setShowAuthModal(false);
        }
      }, 500);
      
    } catch (error: any) {
      console.error("❌ Composio Step 2 failed:", error);
      setErrorMessage(error.message || "Failed to connect Gmail. Please try again.");
      setIsLoadingComposio(false);
    }
  };

  // ============================================================
  // LOADING STATES
  // ============================================================
  
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

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <div className="bg-white overflow-visible">
      {/* Animation Styles */}
      <style>{`
        @keyframes fade-in-wave {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-wave 1s ease-out;
        }
        @keyframes word-fade-in {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes word-fade-out {
          0% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-20px);
          }
        }
        .animate-word-in {
          animation: word-fade-in 0.5s ease-out forwards;
        }
        .animate-word-out {
          animation: word-fade-out 0.5s ease-out forwards;
        }
      `}</style>

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

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-sm transition-all duration-500 ease-out ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'}`}>
        <div className="px-6 md:px-12 lg:px-16 py-4">
          <div className="flex items-center justify-between">
            {/* Logo - Left */}
            <span 
              className="text-xl font-semibold tracking-tight text-gray-900"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Outpost
            </span>

            {/* Logo - Right Side */}
            <img 
              src={outpostLogo} 
              alt="Outpost Logo" 
              className="h-6 md:h-8 w-auto"
            />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-40 md:pt-32 lg:pt-40 px-6 md:px-12 lg:px-16 pb-0 md:pb-32 lg:pb-48">
        <h1 
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-gray-900 leading-tight text-center md:text-left"
          style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
        >
          {["Never", "miss", "what", "matters"].map((word, index) => (
            <span
              key={index}
              className="inline-block mr-2 md:mr-4 opacity-0 animate-fade-in-up"
              style={{ 
                animationDelay: `${index * 0.2}s`,
                animationFillMode: "forwards"
              }}
            >
              {word}
            </span>
          ))}
          <br className="hidden sm:block" />
          {["in", "your", "inbox."].map((word, index) => (
            <span
              key={index + 4}
              className="inline-block mr-2 md:mr-4 opacity-0 animate-fade-in-up"
              style={{ 
                animationDelay: `${(index + 4) * 0.2}s`,
                animationFillMode: "forwards"
              }}
            >
              {word}
            </span>
          ))}
        </h1>

        {/* Subheading - Mobile Only (Rotating) */}
        {subheadingVisible && (
          <div 
            key={animationKey}
            className={`block md:hidden mt-8 text-base sm:text-lg text-gray-500 text-center ${isFadingOut ? 'animate-word-out' : ''}`}
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}
          >
            <p>
              {subheadings[currentSubheadingIndex].line1.split(" ").map((word, index) => (
                <span
                  key={index}
                  className="inline-block mr-1 opacity-0 animate-word-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {word}
                </span>
              ))}
            </p>
            {subheadings[currentSubheadingIndex].line2 && (
              <p>
                {subheadings[currentSubheadingIndex].line2.split(" ").map((word, index) => {
                  const line1WordCount = subheadings[currentSubheadingIndex].line1.split(" ").length;
                  return (
                    <span
                      key={index}
                      className="inline-block mr-1 opacity-0 animate-word-in"
                      style={{ animationDelay: `${(line1WordCount + index) * 0.1}s` }}
                    >
                      {word}
                    </span>
                  );
                })}
              </p>
            )}
          </div>
        )}

        {/* Waitlist Form - Mobile Only */}
        <div className="block md:hidden mt-6">
          {waitlistResponse ? (
            <div className="text-green-600 text-center text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
              ✓ You've joined the waitlist to be part of our early users. We'll notify you via Gmail!
            </div>
          ) : (
            <form onSubmit={handleWaitlistSignup} className="flex flex-col items-center gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                required
                className="px-4 py-2.5 rounded-full border border-gray-300 focus:outline-none focus:border-gray-500 text-sm w-full max-w-xs"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
              <button
                type="submit"
                disabled={waitlistLoading}
                className="px-5 py-2.5 bg-black text-white text-sm rounded-full transition-colors hover:bg-gray-800 disabled:opacity-50"
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
              >
                {waitlistLoading ? "Joining..." : "Join Waitlist"}
              </button>
            </form>
          )}
        </div>

        {/* Image + Subheading Row */}
        <div className="mt-8 md:mt-12 flex flex-col md:flex-row md:items-center gap-8 md:gap-12">
          {/* Product Screenshot */}
          <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: "2s", animationFillMode: "forwards" }}>
            <img 
              src={outpostInbox} 
              alt="Outpost Inbox" 
              className="rounded-2xl shadow-2xl max-w-full md:max-w-3xl lg:max-w-5xl"
            />
          </div>

          {/* Subheading - Desktop Only (Rotating) */}
          {subheadingVisible && (
            <div className="hidden md:block ml-16 lg:ml-24 mt-8">
              <div 
                key={animationKey}
                className={`text-xl lg:text-2xl xl:text-3xl text-gray-900 leading-snug ${isFadingOut ? 'animate-word-out' : ''}`}
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}
              >
                <p className="whitespace-nowrap">
                  {subheadings[currentSubheadingIndex].line1.split(" ").map((word, index) => (
                    <span
                      key={index}
                      className="inline-block mr-2 opacity-0 animate-word-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      {word}
                    </span>
                  ))}
                </p>
                {subheadings[currentSubheadingIndex].line2 && (
                  <p className="whitespace-nowrap">
                    {subheadings[currentSubheadingIndex].line2.split(" ").map((word, index) => {
                      const line1WordCount = subheadings[currentSubheadingIndex].line1.split(" ").length;
                      return (
                        <span
                          key={index}
                          className="inline-block mr-2 opacity-0 animate-word-in"
                          style={{ animationDelay: `${(line1WordCount + index) * 0.1}s` }}
                        >
                          {word}
                        </span>
                      );
                    })}
                  </p>
                )}
              </div>

              {/* Waitlist Form - Desktop */}
              {waitlistResponse ? (
                <div className="mt-8 text-green-600" style={{ fontFamily: "'Inter', sans-serif" }}>
                  ✓ You've joined the waitlist to be part of our early users. We'll notify you via Gmail!
                </div>
              ) : (
                <form onSubmit={handleWaitlistSignup} className="mt-8 flex items-center gap-2">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    required
                    className="px-4 py-2.5 rounded-full border border-gray-300 focus:outline-none focus:border-gray-500 text-base w-64"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  />
                  <button
                    type="submit"
                    disabled={waitlistLoading}
                    className="px-5 py-2.5 bg-black text-white text-base rounded-full transition-colors hover:bg-gray-800 disabled:opacity-50"
                    style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
                  >
                    {waitlistLoading ? "Joining..." : "Join Waitlist"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer 
        ref={footerRef}
        className="mx-4 md:mx-8 lg:mx-16 mt-2 md:mt-16"
      >
        <div className={`bg-black rounded-t-3xl px-8 md:px-12 lg:px-16 pt-6 md:pt-8 pb-3 flex flex-col gap-1 transition-all duration-500 ease-out ${footerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}>
          <div className="flex justify-between items-start">
            <h2 
              className="text-5xl md:text-7xl lg:text-8xl text-white font-semibold leading-none"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Outpost
            </h2>
            <p className="text-sm text-gray-400" style={{ fontFamily: "'Inter', sans-serif" }}>
              © 2025 Outpost. All rights reserved.
            </p>
          </div>
          <div className="flex items-center justify-center gap-4 mt-4">
            <Link 
              to="/privacy" 
              className="text-sm text-gray-400 hover:text-white transition-colors"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Privacy Policy
            </Link>
            <span className="text-gray-600">|</span>
            <Link 
              to="/terms" 
              className="text-sm text-gray-400 hover:text-white transition-colors"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Terms of Use
            </Link>
          </div>
        </div>
      </footer>

      {/* AUTH MODAL - COMMENTED OUT FOR NOW - WILL BE USED LATER */}
      {false && showAuthModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            if (!composioStep1Complete) {
              setShowAuthModal(false);
              setWaitlistResponse(null);
            }
          }}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md md:max-w-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 px-6 py-6 md:px-8 md:py-8">
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  setWaitlistResponse(null);
                }}
                className="absolute top-4 right-4 md:hidden p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>

              {composioStep1Complete ? (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 text-green-600 mb-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>Signed in as {composioUserEmail}</span>
                    </div>
                    <p className="text-sm text-gray-600" style={{ fontFamily: "'Inter', sans-serif" }}>
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
                        <span className="font-medium text-gray-700" style={{ fontFamily: "'Inter', sans-serif" }}>
                          Connect Gmail with Composio
                        </span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {waitlistResponse?.message || "Welcome to Outpost!"}
                    </h3>
                    <p className="text-sm text-gray-600" style={{ fontFamily: "'Inter', sans-serif" }}>
                      You've been added to the waitlist
                    </p>
                  </div>

                  {/* Direct Login Button */}
                  <button
                    onClick={waitlistResponse?.direct_auth_enabled ? handleDirectLogin : undefined}
                    onMouseEnter={() => setHoveredButton('direct')}
                    onMouseLeave={() => setHoveredButton(null)}
                    disabled={!waitlistResponse?.direct_auth_enabled || isLoadingDirect || isLoadingComposio}
                    className={`w-full flex items-center justify-center gap-3 px-4 py-3 border-2 rounded-lg transition-all ${
                      !waitlistResponse?.direct_auth_enabled 
                        ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50' 
                        : hoveredButton === 'direct' 
                          ? 'border-black bg-gray-50' 
                          : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                    }`}
                  >
                    {isLoadingDirect ? (
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill={waitlistResponse?.direct_auth_enabled ? "#4285F4" : "#9CA3AF"} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill={waitlistResponse?.direct_auth_enabled ? "#34A853" : "#9CA3AF"} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill={waitlistResponse?.direct_auth_enabled ? "#FBBC05" : "#9CA3AF"} d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill={waitlistResponse?.direct_auth_enabled ? "#EA4335" : "#9CA3AF"} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span className={`font-medium ${waitlistResponse?.direct_auth_enabled ? 'text-gray-700' : 'text-gray-400'}`} style={{ fontFamily: "'Inter', sans-serif" }}>
                          Sign in with Google
                        </span>
                      </>
                    )}
                  </button>

                  {/* Or Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200"></div>
                    <span className="text-sm text-gray-400" style={{ fontFamily: "'Inter', sans-serif" }}>or</span>
                    <div className="flex-1 h-px bg-gray-200"></div>
                  </div>

                  {/* Composio Login Button */}
                  <button
                    onClick={handleComposioStep1}
                    onMouseEnter={() => setHoveredButton('composio')}
                    onMouseLeave={() => setHoveredButton(null)}
                    disabled={isLoadingDirect || isLoadingComposio}
                    className={`w-full flex items-center justify-center gap-3 px-4 py-3 border-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      hoveredButton === 'composio' 
                        ? 'border-black bg-gray-50' 
                        : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                    }`}
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
                        <span className="font-medium text-gray-700" style={{ fontFamily: "'Inter', sans-serif" }}>
                          Sign in with Google
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Right Panel - Info */}
            <div 
              className="hidden md:flex w-80 bg-black text-white p-8 relative overflow-hidden items-center"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {/* Direct Auth Info */}
              {waitlistResponse && (
                <div className={`space-y-4 transition-opacity duration-200 ${hoveredButton === 'direct' || !hoveredButton ? 'opacity-100' : 'opacity-0'}`}>
                  <p className="text-sm leading-relaxed">
                    Outpost Authentication is currently under Google verification.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-400">
                    By default, you will be added to the waitlist. We'll notify you via <span className="text-white">Gmail</span> once your email is added as a test user. After that, return here and sign in again to get access.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-400">
                    Your OAuth access will be securely managed and protected by <span className="text-white">Outpost</span>.
                  </p>
                  <p className="text-sm italic text-gray-300 mt-6">
                    Recommended by Outpost
                  </p>
                </div>
              )}

              {/* Composio Info - Overlay */}
              {waitlistResponse && (
                <div className={`space-y-4 transition-opacity duration-200 absolute top-0 left-0 right-0 bottom-0 flex flex-col justify-center p-8 ${hoveredButton === 'composio' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <p className="text-sm leading-relaxed">
                    Get instant access to Outpost with Composio authentication.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-400">
                    Your OAuth access and limited profile data are securely accessed and managed by <span className="text-white">Composio</span>. If you choose this sign-in method, a one-time fee of <span className="text-white">$5</span> applies.
                  </p>
                </div>
              )}

              {/* Composio Step 2 Info */}
              {composioStep1Complete && (
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed">
                    Connect your Gmail to start using Outpost.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-400">
                    Your emails will be processed securely to help you stay organized.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* END AUTH MODAL */}
    </div>
  );
};

export default Index;