// SearchInput.tsx - Search input with operators hint and search button
// Features:
// - Natural language input
// - Search button
// - Loading state
// - Help button for operators

import { forwardRef } from 'react';
import { Search, Loader2, HelpCircle } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onShowHelp: () => void;
  isSearching: boolean;
  placeholder?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, onSearch, onShowHelp, isSearching, placeholder }, ref) => {
    return (
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
            {isSearching ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#8FA8A3]" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </div>
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && value.trim() && !isSearching) {
                e.preventDefault();
                onSearch();
              }
            }}
            placeholder={placeholder || 'Search emails...'}
            className="w-full bg-[#1a1a1a] text-white text-sm rounded-xl pl-12 pr-12 py-3.5 outline-none border border-zinc-700/50 focus:border-[#8FA8A3]/50 transition-colors placeholder:text-zinc-500"
            disabled={isSearching}
            autoComplete="off"
            spellCheck={false}
          />
          {/* Help Button */}
          <button
            onClick={onShowHelp}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Search operators help"
            type="button"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
        
        {/* Search Button */}
        <button
          onClick={onSearch}
          disabled={!value.trim() || isSearching}
          className={`
            flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all
            ${!value.trim() || isSearching
              ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
              : 'bg-[#8FA8A3] hover:bg-[#7a9691] text-white cursor-pointer'
            }
          `}
        >
          {isSearching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Searching...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Search</span>
            </>
          )}
        </button>
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';

export default SearchInput;