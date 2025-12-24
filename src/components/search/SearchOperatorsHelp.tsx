// SearchOperatorsHelp.tsx - Modal showing available search operators
// Features:
// - Comprehensive list of Gmail-style operators
// - Natural language examples
// - Copy to search functionality
// - Clean modal design

import { useEffect, useRef } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface SearchOperatorsHelpProps {
  onClose: () => void;
}

interface OperatorInfo {
  operator: string;
  description: string;
  example: string;
}

const operators: OperatorInfo[] = [
  { operator: 'from:', description: 'Emails from a sender', example: 'from:john' },
  { operator: 'to:', description: 'Emails sent to a recipient', example: 'to:sarah' },
  { operator: 'subject:', description: 'Subject line contains', example: 'subject:invoice' },
  { operator: '"quotes"', description: 'Exact phrase match', example: '"project deadline"' },
  { operator: 'has:attachment', description: 'Emails with attachments', example: 'has:attachment' },
  { operator: 'in:inbox', description: 'Search in Inbox', example: 'in:inbox' },
  { operator: 'in:sent', description: 'Search in Sent', example: 'in:sent' },
  { operator: 'in:done', description: 'Search in Done/Archive', example: 'in:done' },
  { operator: 'in:trash', description: 'Search in Trash', example: 'in:trash' },
  { operator: 'in:drafts', description: 'Search in Drafts', example: 'in:drafts' },
  { operator: 'is:unread', description: 'Unread emails only', example: 'is:unread' },
  { operator: 'is:read', description: 'Read emails only', example: 'is:read' },
  { operator: 'category:', description: 'Filter by category', example: 'category:urgent' },
  { operator: 'before:', description: 'Emails before date', example: 'before:2024/12/01' },
  { operator: 'after:', description: 'Emails after date', example: 'after:2024/12/01' },
  { operator: 'older_than:', description: 'Older than (d/w/m/y)', example: 'older_than:7d' },
  { operator: 'newer_than:', description: 'Newer than (d/w/m/y)', example: 'newer_than:1w' },
  { operator: '-', description: 'Exclude (NOT)', example: '-in:trash' },
  { operator: 'OR', description: 'Match either condition', example: 'from:john OR from:jane' },
];

const naturalLanguageExamples = [
  { query: 'What did Rahul say about the payment?', description: 'Find emails from Rahul mentioning payment' },
  { query: 'Emails I haven\'t replied to', description: 'Unread emails waiting for response' },
  { query: 'Find invoices from last month', description: 'Invoice emails from recent period' },
  { query: 'Show me attachments from HR', description: 'HR emails with files attached' },
  { query: 'Urgent emails about the project', description: 'High-priority project discussions' },
];

const complexExamples = [
  'from:rahul has:attachment subject:invoice after:2024/12/01',
  'from:priya OR from:amit "project update" -in:trash newer_than:2w',
  'category:urgent is:unread has:attachment',
  'to:me from:finance subject:report before:2024/12/15',
];

export function SearchOperatorsHelp({ onClose }: SearchOperatorsHelpProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-[60]" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[60] pointer-events-none p-4">
        <div 
          ref={modalRef}
          className="pointer-events-auto bg-[#2d2d2d] rounded-2xl shadow-2xl overflow-hidden max-w-3xl w-full max-h-[80vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700/50">
            <h2 className="text-lg font-semibold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Search Operators
            </h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto hide-scrollbar p-6">
            {/* Natural Language Section */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-[#8FA8A3] uppercase tracking-wider mb-3">
                Natural Language Examples
              </h3>
              <p className="text-xs text-zinc-500 mb-4">
                Just type what you're looking for - AI understands natural language!
              </p>
              <div className="space-y-2">
                {naturalLanguageExamples.map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between px-3 py-2 bg-zinc-800/50 rounded-lg group"
                  >
                    <div className="flex-1 min-w-0">
                      <code className="text-sm text-[#8FA8A3]">{item.query}</code>
                      <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>
                    </div>
                    <button
                      onClick={() => handleCopy(item.query, index)}
                      className="p-1.5 hover:bg-zinc-700 rounded transition-colors opacity-0 group-hover:opacity-100 ml-2"
                      title="Copy to clipboard"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-zinc-400" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Operators Table */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-[#8FA8A3] uppercase tracking-wider mb-3">
                Search Operators
              </h3>
              <p className="text-xs text-zinc-500 mb-4">
                Use these operators like Gmail for precise searches
              </p>
              <div className="overflow-hidden rounded-lg border border-zinc-700/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-800/50">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Operator</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Example</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-700/30">
                    {operators.map((op, index) => (
                      <tr key={index} className="hover:bg-zinc-800/30 transition-colors group">
                        <td className="px-4 py-2.5">
                          <code className="text-[#8FA8A3] bg-zinc-800 px-1.5 py-0.5 rounded text-xs">
                            {op.operator}
                          </code>
                        </td>
                        <td className="px-4 py-2.5 text-zinc-400 text-xs">
                          {op.description}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <code className="text-zinc-300 text-xs">{op.example}</code>
                            <button
                              onClick={() => handleCopy(op.example, 100 + index)}
                              className="p-1 hover:bg-zinc-700 rounded transition-colors opacity-0 group-hover:opacity-100"
                              title="Copy"
                            >
                              {copiedIndex === 100 + index ? (
                                <Check className="w-3 h-3 text-green-400" />
                              ) : (
                                <Copy className="w-3 h-3 text-zinc-500" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Complex Examples */}
            <div>
              <h3 className="text-sm font-semibold text-[#8FA8A3] uppercase tracking-wider mb-3">
                Complex Search Examples
              </h3>
              <p className="text-xs text-zinc-500 mb-4">
                Combine multiple operators for powerful searches
              </p>
              <div className="space-y-2">
                {complexExamples.map((example, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between px-4 py-3 bg-zinc-800/50 rounded-lg group"
                  >
                    <code className="text-sm text-zinc-300 break-all">{example}</code>
                    <button
                      onClick={() => handleCopy(example, 200 + index)}
                      className="p-1.5 hover:bg-zinc-700 rounded transition-colors opacity-0 group-hover:opacity-100 ml-3 flex-shrink-0"
                      title="Copy to clipboard"
                    >
                      {copiedIndex === 200 + index ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-zinc-400" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Categories Info */}
            <div className="mt-8 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Available Categories
              </h4>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30">urgent</span>
                <span className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">important</span>
                <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">promises</span>
                <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">awaiting</span>
                <span className="text-xs px-2 py-1 rounded bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">others</span>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="px-6 py-3 border-t border-zinc-700/50 flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              Tip: Combine natural language with operators for best results
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default SearchOperatorsHelp;