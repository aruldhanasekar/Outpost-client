import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import OutpostLogo from "@/assets/Outpost.png";

const Privacy = () => {
  return (
    <div className="h-screen bg-white flex flex-col overflow-y-auto">
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
      <main className="max-w-4xl mx-auto px-6 py-12 flex-1">
        <h1 
          className="text-3xl md:text-4xl font-bold text-black mb-4"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Privacy Policy
        </h1>

        <p 
          className="text-gray-500 mb-8"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          Last updated: 18/12/2025
        </p>

        <div 
          className="prose prose-gray max-w-none space-y-8"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">Your Privacy Matters</h2>
            <p className="text-gray-700">
              Outpost is built around a simple belief: <strong>your email is personal, and you should stay in control of it.</strong>
            </p>
            <p className="text-gray-700">
              We chose the name Outpost because an outpost guards what comes in and what goes out. <strong>Your email should never be accessed, shared, or used without your permission.</strong>
            </p>
            <p className="text-gray-700">
              This Privacy Policy explains what information we collect, why we collect it, and how we handle your data when you use Outpost. We've written it in plain language so it's easy to understand.
            </p>
            <p className="text-gray-700">
              Our goal is simple: <strong>help you manage what matters in email without compromising your privacy.</strong>
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">Information We Collect</h2>
            <p className="text-gray-700">
              <strong>Outpost only works with your data when you allow it.</strong>
            </p>
            <p className="text-gray-700">
              When you sign up, we collect a small amount of basic information: <strong>your name, email address, and time zone.</strong>
            </p>
            <p className="text-gray-700">
              If you choose to connect your email, you allow Outpost to access your <strong>emails and drafts</strong> only to organize your inbox and track promises and replies.
            </p>
            <p className="text-gray-700">
              <strong>You can disconnect your email at any time.</strong>
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">How We Use Your Information</h2>
            <p className="text-gray-700">
              Outpost uses your information <strong>only to provide and run the product.</strong>
            </p>
            <p className="text-gray-700">
              When you connect your email, our AI models process your emails so Outpost can work as an AI inbox. This processing is limited to what's needed to deliver the Outpost experience.
            </p>
            <p className="text-gray-700">
              <strong>In the first version of Outpost, we do not use your email data to train our AI models.</strong> We do not use your data for advertising, and we do not sell or rent your data.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">AI Training & Human Access</h2>
            <p className="text-gray-700">
              Outpost is designed to work automatically.
            </p>
            <p className="text-gray-700">
              Your emails are processed by systems, <strong>not read by people.</strong>
            </p>
            <p className="text-gray-700">
              <strong>Your email data is not used to train AI models in the first version of Outpost.</strong>
            </p>
            <p className="text-gray-700">
              In rare cases, limited access may be required for support, and <strong>access is kept minimal and handled with care.</strong>
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">Data Storage & Security</h2>
            <p className="text-gray-700">
              <strong>We take protecting your data seriously.</strong>
            </p>
            <p className="text-gray-700">
              Outpost stores information securely and uses reasonable safeguards to protect it from unauthorized access, loss, or misuse. Access to user data is <strong>limited to what's necessary</strong> to operate and support the product.
            </p>
            <p className="text-gray-700">
              While no system can guarantee absolute security, we continuously work to improve our practices as Outpost grows.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">Third-Party Services & Gmail API</h2>
            <p className="text-gray-700">
              Outpost uses a small number of third-party services to operate reliably.
            </p>
            <p className="text-gray-700">
              When you connect your email, Outpost uses the <strong>Google Gmail API with limited scopes only.</strong> All access follows <strong>Google's Gmail API policies and regulations.</strong>
            </p>
            <p className="text-gray-700">
              We share only the minimum information required for Outpost to work. <strong>Your email data is not shared for advertising or independent use.</strong>
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">Payments & Pricing</h2>
            <p className="text-gray-700">
              Outpost may charge a <strong>small fee</strong> to access the first version of the product. This helps support the development and continued improvement of Outpost.
            </p>
            <p className="text-gray-700">
              All payments are processed through a <strong>trusted third-party payment gateway.</strong> Outpost does not store or directly handle your payment details.
            </p>
            <p className="text-gray-700">
              <strong>Payments made for Outpost are non-refundable.</strong>
            </p>
            <p className="text-gray-700">
              As Outpost grows, pricing and plans may change. If we introduce new pricing or make meaningful updates, we'll communicate those changes clearly.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">Your Choices & Control</h2>
            <p className="text-gray-700">
              <strong>You stay in control of your data at all times.</strong>
            </p>
            <p className="text-gray-700">
              You can choose whether to connect your email, <strong>disconnect it anytime, or request deletion.</strong>
            </p>
            <p className="text-gray-700">
              <strong>We don't lock your data in or make it difficult to leave.</strong>
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">Data Retention & Deletion</h2>
            <p className="text-gray-700">
              We keep your information <strong>only as long as needed</strong> to provide Outpost.
            </p>
            <p className="text-gray-700">
              If you disconnect your email or stop using Outpost, we stop accessing your inbox. You can request deletion, and <strong>we'll handle it within a reasonable time.</strong>
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">Changes to This Policy</h2>
            <p className="text-gray-700">
              As Outpost evolves, we may update this Privacy Policy.
            </p>
            <p className="text-gray-700">
              When we do, we'll update this page so you're always aware of how your information is handled. We encourage you to review this policy from time to time.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">Contact Us</h2>
            <p className="text-gray-700">
              If you have any questions about this Privacy Policy, your data, or payments, you can reach us at:
            </p>
            <p className="text-gray-700">
              📧 <a href="mailto:arul@useoutpostmail.com" className="text-black underline hover:text-gray-600">arul@useoutpostmail.com</a>
            </p>
            <p className="text-gray-700">
              We're always happy to help.
            </p>
          </section>
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

export default Privacy;