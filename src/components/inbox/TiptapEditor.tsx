// TiptapEditor.tsx - Rich text editor component using Tiptap
// Phase 5: S3 attachment support with upload progress
// Provides HTML and plain text output for email composition

import { useEffect, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorToolbar } from './EditorToolbar';
import { X, Paperclip, FileText, Image, File, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { formatFileSize } from '@/utils/formatters';

// Attachment type with S3 upload status
export interface AttachedFile {
  id: string;           // Attachment ID (temp-xxx before upload, real ID after)
  name: string;         // Original filename
  size: number;         // File size in bytes
  type: string;         // MIME type
  file?: File;          // Original File object (cleared after upload)
  status: 'pending' | 'uploading' | 'uploaded' | 'error';  // Upload status
  progress?: number;    // Upload progress percentage (0-100)
  error?: string;       // Error message if status is 'error'
}

// Get icon for file type
const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return Image;
  if (type.includes('pdf') || type.includes('document') || type.includes('text')) return FileText;
  return File;
};

// Methods exposed to parent via ref
export interface TiptapEditorRef {
  getHTML: () => string;
  getText: () => string;
  isEmpty: () => boolean;
  focus: () => void;
  clear: () => void;
}

interface TiptapEditorProps {
  placeholder?: string;
  onChange?: (html: string, text: string) => void;
  initialContent?: string;
  className?: string;
  attachments?: AttachedFile[];
  onAttachmentsChange?: (files: AttachedFile[]) => void;
  onRemoveAttachment?: (id: string) => void;
}

export const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(
  ({ 
    placeholder = 'Write your message...', 
    onChange, 
    initialContent = '', 
    className = '',
    attachments = [],
    onAttachmentsChange,
    onRemoveAttachment
  }, ref) => {
    
    // Initialize Tiptap editor
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          // Disable heading as we don't need it for email
          heading: false,
          // Disable code and codeBlock for email
          code: false,
          codeBlock: false,
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: 'text-[#f7ac5c] underline cursor-pointer',
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        }),
        Placeholder.configure({
          placeholder,
          emptyEditorClass: 'is-editor-empty',
        }),
      ],
      content: initialContent,
      editorProps: {
        attributes: {
          class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[200px] text-white leading-relaxed',
        },
      },
      onUpdate: ({ editor }) => {
        if (onChange) {
          onChange(editor.getHTML(), editor.getText());
        }
      },
    });
    
    // Expose methods to parent component via ref
    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() || '',
      getText: () => editor?.getText() || '',
      isEmpty: () => editor?.isEmpty || true,
      focus: () => editor?.commands.focus(),
      clear: () => editor?.commands.clearContent(),
    }), [editor]);
    
    // Set initial content when editor is ready
    useEffect(() => {
      if (editor && initialContent && editor.isEmpty) {
        editor.commands.setContent(initialContent);
      }
    }, [editor, initialContent]);
    
    // Cleanup on unmount
    useEffect(() => {
      return () => {
        editor?.destroy();
      };
    }, [editor]);
    
    // Add keyboard shortcut for link (Cmd+K)
    useEffect(() => {
      if (!editor) return;
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          // Trigger link insertion - will be handled by toolbar
          const event = new CustomEvent('tiptap-insert-link');
          document.dispatchEvent(event);
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [editor]);
    
    // Handle paste-to-attach: When user pastes files, add them as attachments
    useEffect(() => {
      if (!editor) return;
      
      const handlePaste = (e: ClipboardEvent) => {
        const files = e.clipboardData?.files;
        if (!files || files.length === 0) return;
        
        // Check if there are actual files (not just text)
        const fileArray = Array.from(files);
        if (fileArray.length === 0) return;
        
        // Prevent default paste behavior for files
        e.preventDefault();
        
        // Create AttachedFile objects for each pasted file
        const newAttachments: AttachedFile[] = fileArray.map(file => ({
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name || `pasted-${file.type.split('/')[0]}-${Date.now()}`,
          size: file.size,
          type: file.type,
          file: file,
          status: 'pending' as const,
          progress: 0
        }));
        
        // Add to existing attachments
        if (onAttachmentsChange) {
          onAttachmentsChange([...attachments, ...newAttachments]);
        }
      };
      
      // Get the editor DOM element
      const editorElement = editor.view.dom;
      editorElement.addEventListener('paste', handlePaste);
      
      return () => {
        editorElement.removeEventListener('paste', handlePaste);
      };
    }, [editor, attachments, onAttachmentsChange]);
    
    // Get status color for attachment border
    const getStatusBorderClass = (status: AttachedFile['status'], progress?: number) => {
      switch (status) {
        case 'error':
          return 'border border-red-500/50';
        case 'uploaded':
          return 'border border-green-500/30';
        case 'uploading':
          return 'border border-[#f7ac5c]/30';
        case 'pending':
          return progress && progress > 0 ? 'border border-[#f7ac5c]/30' : '';
        default:
          return '';
      }
    };
    
    return (
      <div className={`flex flex-col h-full ${className}`}>
        {/* Editor Content Area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <EditorContent 
            editor={editor} 
            className="h-full"
          />
        </div>
        
        {/* Attachments Display - Above toolbar */}
        {attachments.length > 0 && (
          <div className="px-5 py-3 border-t border-zinc-700/30">
            <div className="flex items-center gap-2 mb-2">
              <Paperclip className="w-4 h-4 text-zinc-500" />
              <span className="text-xs text-zinc-500">
                {attachments.length} attachment{attachments.length > 1 ? 's' : ''}
                {/* Show upload status summary */}
                {attachments.some(a => a.status === 'uploading') && (
                  <span className="ml-2 text-[#f7ac5c]">
                    (uploading...)
                  </span>
                )}
                {attachments.some(a => a.status === 'error') && (
                  <span className="ml-2 text-red-400">
                    (some failed)
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {attachments.map((file) => {
                const FileIcon = getFileIcon(file.type);
                const progress = file.progress || 0;
                const circumference = 2 * Math.PI * 10; // radius = 10
                const strokeDashoffset = circumference - (progress / 100) * circumference;
                
                return (
                  <div 
                    key={file.id}
                    className={`flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2 group ${getStatusBorderClass(file.status, progress)}`}
                  >
                    {/* File type icon */}
                    <div className="flex-shrink-0">
                      <FileIcon className="w-4 h-4 text-zinc-400" />
                    </div>
                    
                    {/* File info */}
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs text-white truncate max-w-[150px]">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {formatFileSize(file.size)}
                        {(file.status === 'uploading' || (file.status === 'pending' && progress > 0)) && ` • ${progress}%`}
                      </span>
                      {/* Error message */}
                      {file.status === 'error' && file.error && (
                        <span className="text-[10px] text-red-400 truncate max-w-[150px]">
                          {file.error}
                        </span>
                      )}
                    </div>
                    
                    {/* Status indicator with circular progress or checkmark */}
                    <div className="flex-shrink-0 flex items-center">
                      {/* Show circular progress for uploading OR pending with progress */}
                      {(file.status === 'uploading' || (file.status === 'pending' && progress > 0)) && (
                        <div className="relative w-6 h-6 flex items-center justify-center">
                          {/* Circular progress ring */}
                          <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
                            {/* Background circle */}
                            <circle
                              cx="12"
                              cy="12"
                              r="10"
                              fill="none"
                              stroke="#3f3f46"
                              strokeWidth="2"
                            />
                            {/* Progress circle */}
                            <circle
                              cx="12"
                              cy="12"
                              r="10"
                              fill="none"
                              stroke="#f7ac5c"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              className="transition-all duration-200"
                            />
                          </svg>
                          {/* X button in center */}
                          <button
                            onClick={() => onRemoveAttachment?.(file.id)}
                            className="absolute inset-0 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
                            title="Cancel upload"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      
                      {/* Uploaded: green check + X button */}
                      {file.status === 'uploaded' && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <button
                            onClick={() => onRemoveAttachment?.(file.id)}
                            className="p-0.5 hover:bg-zinc-700 rounded transition-colors text-zinc-500 hover:text-white"
                            title="Remove"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      
                      {file.status === 'error' && (
                        <button
                          onClick={() => onRemoveAttachment?.(file.id)}
                          className="p-1 hover:bg-zinc-700 rounded transition-colors text-red-500 hover:text-red-400"
                          title="Remove"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      
                      {/* Pending with no progress yet */}
                      {file.status === 'pending' && progress === 0 && (
                        <button
                          onClick={() => onRemoveAttachment?.(file.id)}
                          className="p-1 hover:bg-zinc-700 rounded transition-colors text-zinc-500 hover:text-white"
                          title="Remove"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Toolbar - Below attachments */}
        <EditorToolbar 
          editor={editor} 
          attachments={attachments}
          onAttachmentsChange={onAttachmentsChange}
        />
        
        {/* Custom styles for Tiptap */}
        <style>{`
          /* Placeholder styling */
          .tiptap p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #52525b;
            pointer-events: none;
            height: 0;
          }
          
          /* Editor content styling */
          .tiptap {
            min-height: 200px;
            outline: none;
          }
          
          .tiptap p {
            margin: 0;
            margin-bottom: 0.5rem;
          }
          
          .tiptap ul,
          .tiptap ol {
            padding-left: 1.5rem;
            margin: 0.5rem 0;
          }
          
          .tiptap li {
            margin: 0.25rem 0;
          }
          
          .tiptap ul {
            list-style-type: disc;
          }
          
          .tiptap ol {
            list-style-type: decimal;
          }
          
          .tiptap a {
            color: #f7ac5c;
            text-decoration: underline;
            cursor: pointer;
          }
          
          .tiptap strong {
            font-weight: 600;
          }
          
          .tiptap em {
            font-style: italic;
          }
          
          .tiptap u {
            text-decoration: underline;
          }
          
          /* Focus state */
          .tiptap:focus {
            outline: none;
          }
          
          /* Prose overrides for dark theme */
          .prose-invert {
            color: #ffffff;
          }
        `}</style>
      </div>
    );
  }
);

TiptapEditor.displayName = 'TiptapEditor';