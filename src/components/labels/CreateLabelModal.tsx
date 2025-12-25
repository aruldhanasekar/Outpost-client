// components/labels/CreateLabelModal.tsx
// Modal for creating labels with optional auto-labeling by email addresses

import { useEffect, useState, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

interface CreateLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLabelCreated?: () => void;
}

export function CreateLabelModal({ isOpen, onClose, onLabelCreated }: CreateLabelModalProps) {
  const { currentUser } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Form state
  const [labelName, setLabelName] = useState('');
  const [autoLabel, setAutoLabel] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [emailQuery, setEmailQuery] = useState('');
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([]);
  const [allEmails, setAllEmails] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Label name validation state
  const [existingLabels, setExistingLabels] = useState<string[]>([]);
  const [labelNameError, setLabelNameError] = useState<string | null>(null);
  const [isCheckingName, setIsCheckingName] = useState(false);
  
  const emailInputRef = useRef<HTMLInputElement>(null);
  const nameCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle open/close with animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      const timeout = setTimeout(() => {
        setIsVisible(false);
        // Reset form on close
        setLabelName('');
        setAutoLabel(false);
        setSelectedEmails([]);
        setEmailQuery('');
        setEmailSuggestions([]);
        setLabelNameError(null);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Fetch existing labels when modal opens
  useEffect(() => {
    const fetchLabels = async () => {
      if (!currentUser || !isOpen) return;
      
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch(`${API_URL}/api/labels`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Store display names (case-insensitive comparison later)
          const labels = (data.labels || []).map((l: { display_name: string }) => l.display_name.toLowerCase());
          setExistingLabels(labels);
        }
      } catch (err) {
        console.error('Error fetching labels:', err);
      }
    };

    fetchLabels();
  }, [currentUser, isOpen]);

  // Fetch all unique emails from inbox on mount
  useEffect(() => {
    const fetchEmails = async () => {
      if (!currentUser || !isOpen) return;
      
      setSuggestionsLoading(true);
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch(`${API_URL}/api/emails/contacts`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setAllEmails(data.emails || []);
        }
      } catch (err) {
        console.error('Error fetching contacts:', err);
      } finally {
        setSuggestionsLoading(false);
      }
    };

    fetchEmails();
  }, [currentUser, isOpen]);

  // Debounced label name validation
  useEffect(() => {
    // Clear previous timeout
    if (nameCheckTimeoutRef.current) {
      clearTimeout(nameCheckTimeoutRef.current);
    }
    
    // Clear error if empty
    if (!labelName.trim()) {
      setLabelNameError(null);
      setIsCheckingName(false);
      return;
    }
    
    setIsCheckingName(true);
    
    // Debounce: wait 300ms after user stops typing
    nameCheckTimeoutRef.current = setTimeout(() => {
      const nameToCheck = labelName.trim().toLowerCase();
      
      if (existingLabels.includes(nameToCheck)) {
        setLabelNameError('Label name already exists');
      } else {
        setLabelNameError(null);
      }
      setIsCheckingName(false);
    }, 300);
    
    return () => {
      if (nameCheckTimeoutRef.current) {
        clearTimeout(nameCheckTimeoutRef.current);
      }
    };
  }, [labelName, existingLabels]);

  // Filter suggestions based on query
  useEffect(() => {
    if (!emailQuery.trim()) {
      setEmailSuggestions([]);
      return;
    }
    
    const query = emailQuery.toLowerCase();
    const filtered = allEmails
      .filter(email => 
        email.toLowerCase().includes(query) && 
        !selectedEmails.includes(email)
      )
      .slice(0, 5); // Max 5 suggestions
    
    setEmailSuggestions(filtered);
  }, [emailQuery, allEmails, selectedEmails]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Add email chip
  const addEmail = useCallback((email: string) => {
    if (email && !selectedEmails.includes(email)) {
      setSelectedEmails(prev => [...prev, email]);
    }
    setEmailQuery('');
    setEmailSuggestions([]);
    emailInputRef.current?.focus();
  }, [selectedEmails]);

  // Remove email chip
  const removeEmail = useCallback((email: string) => {
    setSelectedEmails(prev => prev.filter(e => e !== email));
  }, []);

  // Handle input keydown (Enter to add, Backspace to remove last)
  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && emailQuery.trim()) {
      e.preventDefault();
      // If there's a suggestion, add the first one
      if (emailSuggestions.length > 0) {
        addEmail(emailSuggestions[0]);
      } else if (emailQuery.includes('@')) {
        // Add custom email if it looks valid
        addEmail(emailQuery.trim());
      }
    } else if (e.key === 'Backspace' && !emailQuery && selectedEmails.length > 0) {
      // Remove last chip
      removeEmail(selectedEmails[selectedEmails.length - 1]);
    }
  };

  // Handle create label
  const handleCreate = async () => {
    if (!labelName.trim() || !currentUser || labelNameError) return;
    
    setIsCreating(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_URL}/api/labels/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: labelName.trim(),
          auto_label: autoLabel,
          auto_label_emails: autoLabel ? selectedEmails : []
        })
      });
      
      if (response.ok) {
        onLabelCreated?.();
        onClose();
      } else {
        const error = await response.json();
        console.error('Failed to create label:', error);
      }
    } catch (err) {
      console.error('Error creating label:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // Check if form is valid
  const isFormValid = labelName.trim() && !labelNameError && !isCheckingName;

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay - click to close */}
      <div 
        className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={`relative bg-[#2d2d2d] rounded-2xl shadow-2xl w-[420px] transition-all duration-200 ${
          isAnimating 
            ? 'opacity-100 scale-100' 
            : 'opacity-0 scale-95'
        }`}
      >
        {/* X Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700/50 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* Content */}
        <div className="p-6 pt-8">
          {/* Label Name */}
          <div className="mb-5">
            <label className="block text-sm text-zinc-400 mb-2">
              Label name
            </label>
            <input
              type="text"
              value={labelName}
              onChange={(e) => setLabelName(e.target.value)}
              placeholder="e.g. Team, Invoices, Projects"
              className={`w-full px-4 py-3 bg-[#1a1a1a] border rounded-xl text-white placeholder-zinc-500 focus:outline-none transition-colors ${
                labelNameError 
                  ? 'border-red-500 focus:border-red-500' 
                  : 'border-zinc-700 focus:border-[#8FA8A3]'
              }`}
              autoFocus
            />
            {/* Error message */}
            {labelNameError && (
              <p className="mt-1.5 text-sm text-red-500">{labelNameError}</p>
            )}
          </div>
          
          {/* Auto Label Toggle */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-sm text-zinc-400">Auto label</span>
            <button
              onClick={() => setAutoLabel(!autoLabel)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                autoLabel ? 'bg-[#8FA8A3]' : 'bg-zinc-600'
              }`}
            >
              <div 
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  autoLabel ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {/* Email Addresses (shown when auto label is ON) */}
          {autoLabel && (
            <div className="mb-5 relative">
              <label className="block text-sm text-zinc-400 mb-2">
                Email addresses
              </label>
              
              {/* Input with chips */}
              <div className="w-full min-h-[48px] px-3 py-2 bg-[#1a1a1a] border border-zinc-700 rounded-xl focus-within:border-[#8FA8A3] transition-colors">
                <div className="flex flex-wrap gap-2">
                  {/* Email Chips */}
                  {selectedEmails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-[#8FA8A3] text-white text-sm rounded-lg"
                    >
                      <span className="truncate max-w-[180px]">{email}</span>
                      <button
                        onClick={() => removeEmail(email)}
                        className="p-0.5 hover:bg-white/20 rounded transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  
                  {/* Input */}
                  <input
                    ref={emailInputRef}
                    type="text"
                    value={emailQuery}
                    onChange={(e) => setEmailQuery(e.target.value)}
                    onKeyDown={handleEmailKeyDown}
                    placeholder={selectedEmails.length === 0 ? "Type to search..." : ""}
                    className="flex-1 min-w-[120px] py-1 bg-transparent text-white placeholder-zinc-500 focus:outline-none text-sm"
                  />
                </div>
              </div>
              
              {/* Suggestions Dropdown - Absolute positioned */}
              {emailSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-[#1a1a1a] border border-zinc-700 rounded-xl overflow-hidden z-10 shadow-lg">
                  {emailSuggestions.map((email) => (
                    <button
                      key={email}
                      onClick={() => addEmail(email)}
                      className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                      {email}
                    </button>
                  ))}
                </div>
              )}
              
              {/* Loading state */}
              {suggestionsLoading && emailQuery && (
                <div className="absolute left-0 right-0 mt-1 px-4 py-2 text-sm text-zinc-500 bg-[#1a1a1a] border border-zinc-700 rounded-xl z-10">
                  Loading...
                </div>
              )}
            </div>
          )}
          
          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={!isFormValid || isCreating}
            className={`w-full py-3 rounded-xl font-medium transition-colors ${
              isFormValid && !isCreating
                ? 'bg-[#8FA8A3] text-white hover:bg-[#7a9691]'
                : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {isCreating ? 'Creating...' : 'Create Label'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateLabelModal;