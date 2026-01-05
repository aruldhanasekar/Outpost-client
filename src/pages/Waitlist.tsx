// Waitlist.tsx - Early Access signup page
// Simplified form with 4 questions

import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { Loader2, CheckCircle } from 'lucide-react';

// Form data interface
interface WaitlistFormData {
  name: string;
  email: string;
  role: string;
  helpWith: string;
}

const initialFormData: WaitlistFormData = {
  name: '',
  email: '',
  role: '',
  helpWith: '',
};

// Dropdown options
const roleOptions = [
  'Founder / Co-founder',
  'Customer support / Operations',
  'Agency / Consultant',
  'Recruiter',
  'Other',
];

export default function WaitlistPage() {
  const [formData, setFormData] = useState<WaitlistFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Block browser back button - prevent going back to index page
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleInputChange = (field: keyof WaitlistFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Work email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.role) {
      setError('Please select your role');
      return false;
    }
    if (!formData.helpWith.trim()) {
      setError('Please tell us what you would like help with');
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
            Early access is currently limited to a small group of users.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Name */}
          <div>
            <label className="block text-zinc-900 text-sm font-medium mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#8FA8A3] transition-colors"
            />
          </div>

          {/* Work Email */}
          <div>
            <label className="block text-zinc-900 text-sm font-medium mb-2">
              Work email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
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

          {/* Help With */}
          <div>
            <label className="block text-zinc-900 text-sm font-medium mb-2">
              What would you like Outpost to help you with? <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.helpWith}
              onChange={(e) => handleInputChange('helpWith', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#8FA8A3] transition-colors resize-none"
            />
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
        </form>
      </div>
    </div>
  );
}