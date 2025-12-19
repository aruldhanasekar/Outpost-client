// CategoryDropdown.tsx - EXACT design from original Inbox.tsx
// v2.1: Added unread count badges

import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { Category, CategoryCounts, categories } from './types';

interface CategoryDropdownProps {
  activeCategory: Category;
  onCategoryChange: (category: Category) => void;
  counts?: CategoryCounts;
}

export function CategoryDropdown({ activeCategory, onCategoryChange, counts }: CategoryDropdownProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownReady, setDropdownReady] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const activeCount = counts?.[activeCategory] || 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        setDropdownReady(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Delay hover effects when dropdown opens
  useEffect(() => {
    if (dropdownOpen) {
      const timer = setTimeout(() => {
        setDropdownReady(true);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setDropdownReady(false);
    }
  }, [dropdownOpen]);

  // Handle category select from dropdown
  const handleDropdownSelect = (category: Category) => {
    onCategoryChange(category);
    setDropdownOpen(false);
    setDropdownReady(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-1 text-white font-medium px-2 py-1 hover:bg-zinc-700/50 rounded-lg transition-colors"
      >
        <span className="capitalize text-sm flex items-center gap-1.5">
          {activeCategory}
          {activeCount > 0 && (
            <span className="text-xs">{activeCount}</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div 
          className="absolute top-full left-0 mt-2 w-40 bg-[#1a1a1a] border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden"
          style={{ pointerEvents: dropdownReady ? 'auto' : 'none' }}
        >
          {categories.map((category) => {
            const count = counts?.[category.id] || 0;
            
            return (
              <button
                key={category.id}
                onClick={() => handleDropdownSelect(category.id)}
                className={`
                  w-full px-4 py-2.5 transition-colors text-left text-sm flex items-center justify-between
                  ${activeCategory === category.id 
                    ? "bg-[#8FA8A3] text-black font-medium" 
                    : dropdownReady 
                      ? "text-zinc-300 hover:bg-zinc-800" 
                      : "text-zinc-300"
                  }
                `}
              >
                <span>{category.label}</span>
                {count > 0 && (
                  <span className="text-xs">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}