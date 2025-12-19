import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import OutpostLogo from "@/assets/Outpost.png";

const Terms = () => {
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
          Terms of Use
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
          <p className="text-gray-700">
            Outpost is an early-access AI inbox built to help you focus on what matters most in email and keep track of commitments. It works automatically, but it's not perfect. These Terms explain what Outpost does, what it doesn't do, and how responsibility is shared so expectations are clear.
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">About Outpost</h2>
            <p className="text-gray-700">
              Outpost is an AI-powered inbox designed to help you focus on what matters most in email. It reduces inbox noise, brings forward messages that matter, and helps you keep track of promises you've made and replies you're waiting for.
            </p>
            <p className="text-gray-700">
              Outpost connects to your email with your permission and works alongside your existing email provider. It does not replace your email service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">Acceptance of These Terms</h2>
            <p className="text-gray-700">
              By accessing or using Outpost, you agree to these Terms of Use. These Terms apply to all users, including early access users.
            </p>
            <p className="text-gray-700">
              If you're using Outpost on behalf of an organization, you confirm that you have the authority to accept these Terms on its behalf.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">Early Access Status</h2>
            <p className="text-gray-700">
              Outpost is currently offered as an early access product.
            </p>
            <p className="text-gray-700">
              This means: Features may change, improve, or be removed. The product may contain bugs or limitations. Accuracy may vary. Updates may happen frequently.
            </p>
            <p className="text-gray-700">
              Using Outpost during early access means you understand the product is still evolving.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">Eligibility & Account Use</h2>
            <p className="text-gray-700">
              To use Outpost, you must provide accurate information and keep your account secure.
            </p>
            <p className="text-gray-700">
              You're responsible for activity under your account and for using Outpost in a lawful and reasonable way. Please don't misuse the service or attempt to interfere with how it works.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">Email Access & Permissions</h2>
            <p className="text-gray-700">
              Outpost works only with your permission.
            </p>
            <p className="text-gray-700">
              When you connect your email: You authorize Outpost to access your emails and drafts. Access is provided through the Google Gmail API. Only limited scopes required for functionality are requested. All access follows Google's API policies and requirements.
            </p>
            <p className="text-gray-700">
              You can revoke email access at any time.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">Use of AI & Automation</h2>
            <p className="text-gray-700">
              Outpost uses AI and automated systems to help manage email.
            </p>
            <p className="text-gray-700">
              These systems are designed to sort emails by what matters most and reduce noise, but they may sometimes: Misclassify messages. Miss context. Surface emails differently than expected.
            </p>
            <p className="text-gray-700">
              Outpost is meant to assist your workflow, not replace your judgment. You should continue reviewing emails that matter to you.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">No Professional Advice</h2>
            <p className="text-gray-700">
              Outpost does not provide legal, financial, medical, or professional advice.
            </p>
            <p className="text-gray-700">
              Any insights or reminders are informational only and should not be relied on as professional guidance.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">Payments & Pricing</h2>
            <p className="text-gray-700">
              Outpost may charge a fee to access certain features or early versions.
            </p>
            <p className="text-gray-700">
              Payments are processed through a trusted third-party payment gateway. Outpost does not store payment details. Payments are non-refundable, unless required by law.
            </p>
            <p className="text-gray-700">
              Pricing and plans may change as the product evolves. Any meaningful changes will be communicated clearly.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">Service Availability</h2>
            <p className="text-gray-700">
              We aim to keep Outpost reliable, but the service is provided on an "as available" basis.
            </p>
            <p className="text-gray-700">
              Outpost may be temporarily unavailable due to: Maintenance or updates. Technical issues. Third-party service interruptions.
            </p>
            <p className="text-gray-700">
              We don't guarantee uninterrupted access, especially during early access.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">User Conduct</h2>
            <p className="text-gray-700">
              You agree not to: Use Outpost for unlawful purposes. Attempt to access systems without authorization. Disrupt or misuse the service. Reverse-engineer or abuse the product.
            </p>
            <p className="text-gray-700">
              We may restrict access if misuse is detected.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">Intellectual Property</h2>
            <p className="text-gray-700">
              Outpost and all related features, content, and branding belong to Outpost.
            </p>
            <p className="text-gray-700">
              You're granted a limited, non-exclusive, non-transferable right to use the service for personal or internal business use.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">Account Suspension or Termination</h2>
            <p className="text-gray-700">
              We may suspend or terminate access to Outpost if: These Terms are violated. The service is misused. Required by law or platform rules.
            </p>
            <p className="text-gray-700">
              You may stop using Outpost at any time.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">Limitation of Liability</h2>
            <p className="text-gray-700">
              Outpost is designed to support you in managing email, but it's important to understand its limits.
            </p>
            <p className="text-gray-700">
              Outpost uses automated systems and AI to help surface what matters most, but outcomes can depend on many factors outside our control. Emails may be delayed, missed, or surfaced differently than expected.
            </p>
            <p className="text-gray-700">
              Outpost is meant to assist, not guarantee outcomes. It works best as part of your broader workflow.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">Disclaimer of Warranties</h2>
            <p className="text-gray-700">
              Outpost is provided with care and intention, but it's important to be clear about expectations.
            </p>
            <p className="text-gray-700">
              The service is provided "as is" and "as available." We don't make guarantees that: Outpost will always surface everything that matters. AI results will always be accurate. The service will be uninterrupted or error-free.
            </p>
            <p className="text-gray-700">
              We continuously work to improve Outpost, especially during early access.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">Changes to These Terms</h2>
            <p className="text-gray-700">
              As Outpost grows, we may update these Terms.
            </p>
            <p className="text-gray-700">
              When changes are made: We'll update this page. Continued use of Outpost means you accept the updated Terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">Governing Law</h2>
            <p className="text-gray-700">
              These Terms are governed by applicable laws based on where Outpost operates, without regard to conflict-of-law principles.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-black">Contact Us</h2>
            <p className="text-gray-700">
              If you have questions about these Terms or Outpost, you can reach us at:
            </p>
            <p className="text-gray-700">
              <a href="mailto:arul@useoutpostmail.com" className="text-black underline hover:text-gray-600">arul@useoutpostmail.com</a>
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

export default Terms;