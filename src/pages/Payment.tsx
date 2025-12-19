import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import OutpostLogo from "@/assets/Outpost.png";

const Payment = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <svg 
              className="w-10 h-10 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" 
              />
            </svg>
          </div>

          {/* Title */}
          <h1 
            className="text-2xl md:text-3xl font-bold text-black mb-4"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Payment Coming Soon
          </h1>

          {/* Message */}
          <div 
            className="space-y-4 mb-8"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            <p className="text-gray-800 text-base leading-relaxed">
              We're currently working on integrating our payment gateway to make your experience smooth and secure.
            </p>
            <p className="text-gray-800 text-base leading-relaxed">
              We'll notify you at <strong>{email || 'your email'}</strong> once the payment process is ready.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              Thank you for your patience!
            </p>
          </div>

          {/* Back Button */}
          <Link
            to="/"
            className="inline-block px-8 py-4 bg-black text-white rounded-xl text-base font-medium hover:bg-gray-800 transition-colors"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Back to Home
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 sm:px-6 lg:px-12 border-t border-gray-100">
        {/* Center - Logo */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-6">
          <img 
            src={OutpostLogo} 
            alt="Outpost" 
            className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24"
          />
          <span 
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-semibold tracking-tight text-black"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Outpost
          </span>
        </div>

        {/* Bottom Row - All Links */}
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            {/* Left - Copyright */}
            <p 
              className="text-xs sm:text-sm text-gray-400 text-center sm:text-left order-3 sm:order-1"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              © 2025 Outpost. All rights reserved.
            </p>

            {/* Center - Page Links */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 md:gap-6 order-1 sm:order-2">
              <Link
                to="/privacy"
                className="text-xs sm:text-sm text-gray-500 hover:text-black transition-colors"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="text-xs sm:text-sm text-gray-500 hover:text-black transition-colors"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                Terms of Use
              </Link>
            </div>

            {/* Right - Social Links */}
            <div className="flex items-center justify-center sm:justify-end gap-3 sm:gap-4 md:gap-6 order-2 sm:order-3">
              <a
                href="#"
                className="text-xs sm:text-sm text-gray-500 hover:text-black transition-colors"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                LinkedIn
              </a>
              <a
                href="#"
                className="text-xs sm:text-sm text-gray-500 hover:text-black transition-colors"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                Facebook
              </a>
              <a
                href="#"
                className="text-xs sm:text-sm text-gray-500 hover:text-black transition-colors"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                X
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Payment;