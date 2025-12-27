// components/rules/SenderRulesModal.tsx
// Global sender rules modal - accessible from sidebar
// Dark theme, center modal with tabs for New Rule and Existing Rules

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Trash2, ChevronDown, Loader2, Search, AlertCircle } from 'lucide-react';
import {
  getTriageRules,
  createTriageRule,
  deleteTriageRule,
  updateTriageRuleBySender,
  searchSenders,
  parseTriageRule,
  TriageRule
} from '@/services/emailApi';

interface SenderRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SenderMatch {
  name: string;
  email: string;
  match_score: number;
  has_rule?: boolean;
  rule_category?: string;
}

type TabType = 'new' | 'existing';
type CategoryType = 'URGENT' | 'IMPORTANT' | 'OTHERS';

const CATEGORIES: CategoryType[] = ['URGENT', 'IMPORTANT', 'OTHERS'];

export const SenderRulesModal = ({ isOpen, onClose }: SenderRulesModalProps) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('new');
  
  // New Rule state
  const [inputValue, setInputValue] = useState('');
  const [selectedSender, setSelectedSender] = useState<SenderMatch | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('URGENT');
  const [suggestions, setSuggestions] = useState<SenderMatch[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noMatchWarning, setNoMatchWarning] = useState(false);
  
  // Existing Rules state
  const [rules, setRules] = useState<TriageRule[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch existing rules when tab changes to 'existing'
  useEffect(() => {
    if (isOpen && activeTab === 'existing') {
      fetchRules();
    }
  }, [isOpen, activeTab]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && activeTab === 'new') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, activeTab]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchRules = async () => {
    setIsLoadingRules(true);
    try {
      const response = await getTriageRules();
      setRules(response.rules || []);
    } catch (err) {
      console.error('Error fetching rules:', err);
    } finally {
      setIsLoadingRules(false);
    }
  };

  // Debounced search for autocomplete
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    setSelectedSender(null);
    setNoMatchWarning(false);
    setError(null);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await searchSenders(value);
        setSuggestions(response.matches || []);
        setShowSuggestions(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  // Handle selecting a suggestion
  const handleSelectSuggestion = (sender: SenderMatch) => {
    setSelectedSender(sender);
    setInputValue(sender.name || sender.email);
    setShowSuggestions(false);
    setNoMatchWarning(false);
  };

  // Handle Enter key - parse with AI
  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim() && !selectedSender) {
      e.preventDefault();
      await parseInput();
    }
  };

  // Parse input with AI
  const parseInput = async () => {
    if (!inputValue.trim()) return;
    
    setIsParsing(true);
    setError(null);
    setNoMatchWarning(false);
    
    try {
      const response = await parseTriageRule(inputValue);
      
      // Auto-select category if detected
      if (response.extracted_category) {
        setSelectedCategory(response.extracted_category as CategoryType);
      }
      
      // If we have matches, show them
      if (response.matches && response.matches.length > 0) {
        if (response.matches.length === 1) {
          // Single match - auto-select
          setSelectedSender({
            name: response.matches[0].name,
            email: response.matches[0].email,
            match_score: response.matches[0].match_score
          });
          setInputValue(response.matches[0].name || response.matches[0].email);
        } else {
          // Multiple matches - show suggestions
          setSuggestions(response.matches);
          setShowSuggestions(true);
        }
      } else if (response.extracted_sender) {
        // No database matches but we extracted a sender
        // Allow manual email entry if it's an email
        if (response.is_email) {
          setSelectedSender({
            name: response.extracted_sender.split('@')[0],
            email: response.extracted_sender,
            match_score: 1.0
          });
        } else {
          // Name with no matches - show warning
          setNoMatchWarning(true);
        }
      }
    } catch (err) {
      console.error('Parse error:', err);
      setError('Failed to parse input. Please try again.');
    } finally {
      setIsParsing(false);
    }
  };

  // Create new rule
  const handleCreateRule = async () => {
    if (!selectedSender) {
      setError('Please select a sender first');
      return;
    }
    
    setIsCreating(true);
    setError(null);
    
    try {
      await createTriageRule({
        sender_email: selectedSender.email,
        sender_name: selectedSender.name,
        category: selectedCategory
      });
      
      // Reset form
      setInputValue('');
      setSelectedSender(null);
      setSelectedCategory('URGENT');
      setSuggestions([]);
      
      // Switch to existing rules tab to show the new rule
      setActiveTab('existing');
      fetchRules();
    } catch (err: any) {
      console.error('Create rule error:', err);
      setError(err.message || 'Failed to create rule');
    } finally {
      setIsCreating(false);
    }
  };

  // Update rule category
  const handleUpdateRuleCategory = async (rule: TriageRule, newCategory: CategoryType) => {
    setEditingRuleId(rule.id);
    try {
      await updateTriageRuleBySender(rule.sender_email, newCategory);
      // Update local state
      setRules(prev => prev.map(r => 
        r.id === rule.id ? { ...r, category: newCategory } : r
      ));
    } catch (err) {
      console.error('Update rule error:', err);
    } finally {
      setEditingRuleId(null);
    }
  };

  // Delete rule
  const handleDeleteRule = async (rule: TriageRule) => {
    setDeletingRuleId(rule.id);
    try {
      await deleteTriageRule(rule.id);
      setRules(prev => prev.filter(r => r.id !== rule.id));
    } catch (err) {
      console.error('Delete rule error:', err);
    } finally {
      setDeletingRuleId(null);
    }
  };

  // Clear selected sender (remove chip)
  const handleClearSender = () => {
    setSelectedSender(null);
    setInputValue('');
    setNoMatchWarning(false);
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-100">Sender Rules</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-zinc-700">
          <button
            onClick={() => setActiveTab('new')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'new'
                ? 'text-[#8FA8A3] border-b-2 border-[#8FA8A3]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            New Rule
          </button>
          <button
            onClick={() => setActiveTab('existing')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'existing'
                ? 'text-[#8FA8A3] border-b-2 border-[#8FA8A3]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Existing Rules {rules.length > 0 && `(${rules.length})`}
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {activeTab === 'new' ? (
            /* New Rule Tab */
            <div className="space-y-4">
              {/* Input field */}
              <div className="relative" ref={suggestionsRef}>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Sender
                </label>
                
                {selectedSender ? (
                  /* Selected sender chip */
                  <div className="flex items-center gap-2 p-3 bg-zinc-700/50 rounded-lg border border-zinc-600">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-[#8FA8A3]/20 text-[#8FA8A3] rounded text-sm font-medium">
                          {selectedSender.name}
                        </span>
                        <button
                          onClick={handleClearSender}
                          className="p-0.5 text-zinc-400 hover:text-zinc-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">{selectedSender.email}</p>
                    </div>
                  </div>
                ) : (
                  /* Text input */
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder='Type name, email, or "Emails from John to Urgent"'
                      className="w-full px-4 py-3 bg-zinc-700/50 border border-zinc-600 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#8FA8A3] focus:ring-1 focus:ring-[#8FA8A3]"
                    />
                    {(isSearching || isParsing) && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
                      </div>
                    )}
                  </div>
                )}
                
                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-zinc-700 border border-zinc-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {suggestions.map((sender, index) => (
                      <button
                        key={`${sender.email}-${index}`}
                        onClick={() => handleSelectSuggestion(sender)}
                        className="w-full px-4 py-3 text-left hover:bg-zinc-600 transition-colors border-b border-zinc-600 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-zinc-100">{sender.name}</p>
                            <p className="text-xs text-zinc-400">{sender.email}</p>
                          </div>
                          {sender.has_rule && (
                            <span className="text-xs px-2 py-0.5 bg-zinc-600 text-zinc-300 rounded">
                              Has rule
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* No match warning */}
              {noMatchWarning && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-200">No matching sender found</p>
                    <p className="text-xs text-amber-300/70 mt-1">
                      Try typing an email address directly, or select from suggestions as you type.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              )}
              
              {/* Category selector */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Category
                </label>
                <div className="flex gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedCategory === cat
                          ? 'bg-[#8FA8A3] text-zinc-900'
                          : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Create button */}
              <button
                onClick={handleCreateRule}
                disabled={!selectedSender || isCreating}
                className="w-full px-4 py-3 bg-[#8FA8A3] text-zinc-900 font-medium rounded-lg hover:bg-[#7d9691] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Add Rule'
                )}
              </button>
              
              {/* Help text */}
              <p className="text-xs text-zinc-500 text-center">
                Type a name, email, or natural language like "All emails from John to Urgent"
              </p>
            </div>
          ) : (
            /* Existing Rules Tab */
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {isLoadingRules ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
                </div>
              ) : rules.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400">No sender rules yet</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Create your first rule in the "New Rule" tab
                  </p>
                </div>
              ) : (
                rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center gap-3 p-4 bg-zinc-700/50 rounded-lg border border-zinc-600"
                  >
                    {/* Sender info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-100 truncate">
                        {rule.sender_name || rule.sender_email.split('@')[0]}
                      </p>
                      <p className="text-xs text-zinc-400 truncate">{rule.sender_email}</p>
                    </div>
                    
                    {/* Category dropdown */}
                    <div className="relative">
                      <select
                        value={rule.category}
                        onChange={(e) => handleUpdateRuleCategory(rule, e.target.value as CategoryType)}
                        disabled={editingRuleId === rule.id}
                        className="appearance-none px-3 py-1.5 pr-8 bg-zinc-600 border border-zinc-500 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-[#8FA8A3] cursor-pointer disabled:opacity-50"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    </div>
                    
                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteRule(rule)}
                      disabled={deletingRuleId === rule.id}
                      className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deletingRuleId === rule.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SenderRulesModal;