// EmailChipInput.tsx - Chip/tag style email input for multiple recipients
// Supports adding, removing, and validating email addresses

import { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { X } from 'lucide-react';

interface EmailChipInputProps {
  emails: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  label: string;
  autoFocus?: boolean;
}

// Email validation regex
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export function EmailChipInput({ 
  emails, 
  onChange, 
  placeholder = 'Add email...', 
  label,
  autoFocus = false
}: EmailChipInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Add email to list
  const addEmail = (email: string) => {
    const trimmed = email.trim().toLowerCase();
    
    // Validate and check for duplicates
    if (trimmed && isValidEmail(trimmed) && !emails.includes(trimmed)) {
      onChange([...emails, trimmed]);
      setInputValue('');
    } else if (trimmed && !isValidEmail(trimmed)) {
      // Invalid email - shake animation could be added here
      console.log('Invalid email:', trimmed);
    }
  };
  
  // Remove email from list
  const removeEmail = (emailToRemove: string) => {
    onChange(emails.filter(email => email !== emailToRemove));
  };
  
  // Handle keyboard events
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const value = inputValue.trim();
    
    // Add email on Enter, Tab, or comma
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',') {
      if (value) {
        e.preventDefault();
        addEmail(value);
      }
    }
    
    // Remove last email on Backspace when input is empty
    if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
      removeEmail(emails[emails.length - 1]);
    }
  };
  
  // Handle paste - support pasting multiple emails
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    
    // Check if pasted text contains multiple emails (comma or semicolon separated)
    if (pastedText.includes(',') || pastedText.includes(';') || pastedText.includes(' ')) {
      e.preventDefault();
      
      // Split by comma, semicolon, or space and add valid emails
      const pastedEmails = pastedText
        .split(/[,;\s]+/)
        .map(email => email.trim().toLowerCase())
        .filter(email => email && isValidEmail(email) && !emails.includes(email));
      
      if (pastedEmails.length > 0) {
        onChange([...emails, ...pastedEmails]);
      }
    }
  };
  
  // Handle blur - add email if valid
  const handleBlur = () => {
    setIsFocused(false);
    if (inputValue.trim()) {
      addEmail(inputValue);
    }
  };
  
  // Focus input when clicking container
  const handleContainerClick = () => {
    inputRef.current?.focus();
  };
  
  return (
    <div 
      className={`
        flex items-start px-5 py-3 border-b border-zinc-700/30 cursor-text
        ${isFocused ? 'bg-zinc-800/30' : ''}
      `}
      onClick={handleContainerClick}
    >
      <label className="text-sm text-zinc-500 w-[60px] flex-shrink-0 pt-0.5">
        {label}
      </label>
      
      <div className="flex-1 flex flex-wrap items-center gap-1.5 min-h-[24px]">
        {/* Email chips */}
        {emails.map((email) => (
          <div 
            key={email}
            className="flex items-center gap-1 bg-zinc-700 text-white text-xs px-2 py-1 rounded-md group"
          >
            <span className="max-w-[200px] truncate">{email}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeEmail(email);
              }}
              className="p-0.5 hover:bg-zinc-600 rounded transition-colors text-zinc-400 hover:text-white"
              title="Remove"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        
        {/* Input field */}
        <input
          ref={inputRef}
          type="email"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder={emails.length === 0 ? placeholder : ''}
          autoFocus={autoFocus}
          className="flex-1 min-w-[150px] bg-transparent text-white text-sm outline-none placeholder:text-zinc-600"
        />
      </div>
    </div>
  );
}