import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const Index = () => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasCheckedAuth = useRef(false);

  const [showModal, setShowModal] = useState(false);
  const [currentSentence, setCurrentSentence] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

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
    if (showModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showModal]);

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

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      
      console.log("🔐 Starting OAuth sign-in...");
      
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
          console.log("👁 Popup closed");
          clearInterval(checkClosed);
          setIsLoading(false);
        }
      }, 500);
      
    } catch (error: any) {
      console.error("❌ Sign in failed:", error);
      setErrorMessage(error.message || "Failed to sign in. Please try again.");
      setIsLoading(false);
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
  if (currentUser) {
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

            {/* Google Button - Right */}
            <button
              onClick={handleGoogleSignIn}
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

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 md:p-8"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 
                className="text-2xl font-bold text-black"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                About Outpost
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5 text-black" />
              </button>
            </div>

            <div 
              className="px-6 py-6 space-y-6 text-gray-700 leading-relaxed"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              <p className="text-base">
                <strong>Outpost</strong> is a simple idea executed with discipline. It turns your Gmail into an{" "}
                <strong>accountability engine</strong> so you stop losing <strong>commitments</strong> in the noise.
                Instead of another inbox full of reminders and half-done promises, Outpost extracts the commitments you
                actually care about and makes them <strong>actionable</strong>. The result is less friction between
                intent and delivery and more momentum toward the outcomes that matter.
              </p>

              <p className="text-base">
                After you integrate your Gmail, Outpost fetches the emails from your past two days in both the{" "}
                <strong>Primary</strong> and <strong>Sent</strong> categories and checks whether they contain
                commitments. If an email has no commitments, nothing from it is saved. If it does, Outpost turns that
                commitment into a clear, lightweight <strong>summary</strong> and shows it in your chat interface. This
                keeps the experience focused and private — only meaningful commitments are stored, nothing else.
              </p>

              <p className="text-base">
                Inside the chat, you see exactly what you need: what's <strong>overdue</strong>, what's{" "}
                <strong>due today</strong>, and what's <strong>due tomorrow</strong>. No clutter, no noise, no extra
                dashboards. Just the work that deserves your attention.
              </p>

              <p className="text-base">
                To access your Gmail securely, Outpost uses <strong>Composio</strong> to handle OAuth, so your password is
                never shared and access stays narrow. Outpost reads only what's required to detect commitments in Primary
                and Sent, stores only your basic account details and the summaries it generates, and never saves{" "}
                <strong>raw emails</strong>. Your data is <strong>not used for training</strong>,
                <strong> not used for unrelated analysis,</strong> and <strong>never sold to anyone</strong>. You can
                revoke access or request full <strong>deletion at any time.</strong>
              </p>

              <p className="text-base">
                You also start with <strong>2500 free credits</strong> so you can fully test the product and see how
                well it captures your promises without any commitment from you. Use it freely, push it, and see where it
                shines or falls short.
              </p>

              <p className="text-base">
                This first version is intentionally narrow. Outpost aims to do one thing with clarity: help you see and
                honor your <strong>commitments</strong>. Your <strong>feedback</strong> guides what comes next. After
                using Outpost, share what worked, what didn't, and what you expected it to catch. Every message helps make
                Outpost better at keeping track of your promises and supporting you where it matters most.
              </p>

              <p className="text-base font-medium">
                Outpost helps you keep your word — simply, quietly, and reliably. It makes sure the promises that matter
                never slip through the cracks, guiding you toward a life where commitments are kept and{" "}
                <strong>follow-through</strong> becomes your default.
              </p>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 bg-black text-white hover:bg-gray-800 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;