// WaitlistPage.tsx - Waitlist signup page
// Standalone page with dark theme and single column form

import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { Loader2, CheckCircle, ChevronDown } from 'lucide-react';

// Form data interface
interface WaitlistFormData {
  email: string;
  name: string;
  role: string;
  biggestInboxProblems: string[];
  inboxStressSignals: string[];
  currentEmailTool: string;
}

const initialFormData: WaitlistFormData = {
  email: '',
  name: '',
  role: '',
  biggestInboxProblems: [],
  inboxStressSignals: [],
  currentEmailTool: '',
};

// Dropdown options
const roleOptions = [
  'Founder / Co-founder',
  'Customer support / Operations',
  'Agency / Consultant',
  'Recruiter',
  'Other',
];

const currentEmailToolOptions = [
  'Default inbox only (Gmail / Outlook)',
  'Rules, filters, or labels',
  'Shared inbox or helpdesk tool',
  'AI email tools',
  'Manual system (folders, flags, reminders)',
  'Other',
  'Prefer not to say',
];

const biggestProblemOptions = [
  'Too many emails to read',
  'Writing the same replies again and again',
  'Missing important or urgent emails',
  'Slow response times',
  'Messy inbox with no clear system',
];

const stressSignalOptions = [
  'I often miss important or urgent emails',
  'I reply late even when emails are important',
  'I feel stressed opening my inbox',
  'Email is annoying but manageable',
];

export default function WaitlistPage() {
  const [formData, setFormData] = useState<WaitlistFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Collapsible sections state (collapsed by default)
  const [isProblemExpanded, setIsProblemExpanded] = useState(false);
  const [isStressExpanded, setIsStressExpanded] = useState(false);

  // Block browser back button - prevent going back to index page
  useEffect(() => {
    // Push current state to history
    window.history.pushState(null, '', window.location.href);
    
    // Handle back button press
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleInputChange = (field: keyof WaitlistFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Handle multi-select checkbox toggle
  const handleMultiSelectToggle = (field: 'biggestInboxProblems' | 'inboxStressSignals', value: string) => {
    setFormData(prev => {
      const currentValues = prev[field];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      return { ...prev, [field]: newValues };
    });
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.role) {
      setError('Please select your role');
      return false;
    }
    if (formData.biggestInboxProblems.length === 0) {
      setError('Please select at least one inbox problem');
      return false;
    }
    if (formData.inboxStressSignals.length === 0) {
      setError('Please select at least one statement that describes your situation');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await addDoc(collection(db, 'waitlist'), {
        ...formData,
        createdAt: serverTimestamp(),
      });
      
      setIsSubmitted(true);
    } catch (err) {
      console.error('Error submitting waitlist form:', err);
      setError('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Thank you screen
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#8FA8A3]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-[#8FA8A3]" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-4" style={{ fontFamily: "'Manrope', sans-serif" }}>
            You're on the list!
          </h1>
          <p className="text-zinc-600 text-lg">
            Thank you for signing up for early access. We'll notify you as soon as we're ready to welcome you aboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Form Container */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Title Section */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4" style={{ fontFamily: "'Manrope', sans-serif" }}>
            Get early access to Outpost
          </h1>
          <p className="text-zinc-600 text-lg">
            Be the first to experience AI-powered email management that actually works.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Email */}
          <div>
            <label className="block text-zinc-900 text-sm font-medium mb-2">
              Email address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#8FA8A3] transition-colors"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-zinc-900 text-sm font-medium mb-2">
              Your name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="John Doe"
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#8FA8A3] transition-colors"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-zinc-900 text-sm font-medium mb-2">
              What best describes your role? <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:border-[#8FA8A3] transition-colors appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717a'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
            >
              <option value="" className="bg-white">Select your role</option>
              {roleOptions.map(option => (
                <option key={option} value={option} className="bg-white">{option}</option>
              ))}
            </select>
          </div>

          {/* Biggest Inbox Problem - Collapsible Multi-select */}
          <div className="border border-zinc-300 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setIsProblemExpanded(!isProblemExpanded)}
              className="w-full flex items-center justify-between p-4 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
            >
              <span className="text-zinc-900 text-sm font-medium">
                What is your biggest problem with email today? <span className="text-red-500">*</span>
                {formData.biggestInboxProblems.length > 0 && (
                  <span className="ml-2 text-[#8FA8A3]">({formData.biggestInboxProblems.length} selected)</span>
                )}
              </span>
              <ChevronDown className={`w-5 h-5 text-zinc-500 transition-transform ${isProblemExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isProblemExpanded && (
              <div className="p-4 bg-white border-t border-zinc-300 space-y-3">
                {biggestProblemOptions.map(option => (
                  <label 
                    key={option} 
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      formData.biggestInboxProblems.includes(option) 
                        ? 'border-[#8FA8A3] bg-[#8FA8A3]/10' 
                        : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.biggestInboxProblems.includes(option)}
                      onChange={() => handleMultiSelectToggle('biggestInboxProblems', option)}
                      className="w-4 h-4 text-[#8FA8A3] bg-white border-zinc-300 rounded focus:ring-[#8FA8A3] focus:ring-offset-0"
                    />
                    <span className="text-zinc-700 text-sm">{option}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Inbox Stress Signal - Collapsible Multi-select */}
          <div className="border border-zinc-300 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setIsStressExpanded(!isStressExpanded)}
              className="w-full flex items-center justify-between p-4 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
            >
              <span className="text-zinc-900 text-sm font-medium">
                Which statement best describes your situation? <span className="text-red-500">*</span>
                {formData.inboxStressSignals.length > 0 && (
                  <span className="ml-2 text-[#8FA8A3]">({formData.inboxStressSignals.length} selected)</span>
                )}
              </span>
              <ChevronDown className={`w-5 h-5 text-zinc-500 transition-transform ${isStressExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isStressExpanded && (
              <div className="p-4 bg-white border-t border-zinc-300 space-y-3">
                {stressSignalOptions.map(option => (
                  <label 
                    key={option} 
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      formData.inboxStressSignals.includes(option) 
                        ? 'border-[#8FA8A3] bg-[#8FA8A3]/10' 
                        : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.inboxStressSignals.includes(option)}
                      onChange={() => handleMultiSelectToggle('inboxStressSignals', option)}
                      className="w-4 h-4 text-[#8FA8A3] bg-white border-zinc-300 rounded focus:ring-[#8FA8A3] focus:ring-offset-0"
                    />
                    <span className="text-zinc-700 text-sm">{option}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Current Email Tool - Dropdown */}
          <div>
            <label className="block text-zinc-900 text-sm font-medium mb-2">
              What AI productive tool are you using?
            </label>
            <select
              value={formData.currentEmailTool}
              onChange={(e) => handleInputChange('currentEmailTool', e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:border-[#8FA8A3] transition-colors appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717a'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
            >
              <option value="" className="bg-white">Select an option</option>
              {currentEmailToolOptions.map(option => (
                <option key={option} value={option} className="bg-white">{option}</option>
              ))}
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-[#8FA8A3] hover:bg-[#7a9691] disabled:bg-zinc-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              'Get Early Access'
            )}
          </button>

          {/* Privacy Note */}
          <p className="text-zinc-500 text-xs text-center">
            By joining, you agree to our{' '}
            <a href="/privacy" className="text-[#8FA8A3] hover:underline">Privacy Policy</a>
            {' '}and{' '}
            <a href="/terms" className="text-[#8FA8A3] hover:underline">Terms of Service</a>.
          </p>
        </form>
      </div>
    </div>
  );
}