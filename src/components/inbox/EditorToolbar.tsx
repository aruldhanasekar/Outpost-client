// EditorToolbar.tsx - Formatting toolbar for TiptapEditor
// Icons-based toolbar with dark theme and brand tooltips

import { useState, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Link2,
  Link2Off,
  Paperclip
} from 'lucide-react';
import { LinkPopover } from './LinkPopover';
import { AttachedFile } from './TiptapEditor';

interface EditorToolbarProps {
  editor: Editor | null;
  onAttachmentsChange?: (files: AttachedFile[]) => void;
  attachments?: AttachedFile[];
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  tooltip: string;
  shortcut?: string;
  children: React.ReactNode;
}

// Reusable toolbar button component with brand tooltip
function ToolbarButton({ onClick, isActive, disabled, tooltip, shortcut, children }: ToolbarButtonProps) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          p-2 rounded-lg transition-colors
          ${isActive 
            ? 'bg-zinc-700 text-white' 
            : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {children}
      </button>
      {/* Brand Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-zinc-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {tooltip}
        {shortcut && <span className="ml-1.5 text-zinc-400">({shortcut})</span>}
      </div>
    </div>
  );
}

// Divider between button groups
function ToolbarDivider() {
  return <div className="w-px h-6 bg-zinc-700 mx-1" />;
}

export function EditorToolbar({ 
  editor, 
  onAttachmentsChange, 
  attachments = []
}: EditorToolbarProps) {
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Detect Mac vs Windows for shortcut display
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdKey = isMac ? '⌘' : 'Ctrl';
  
  if (!editor) return null;
  
  // Get current link URL if cursor is on a link
  const getCurrentLinkUrl = (): string => {
    const attrs = editor.getAttributes('link');
    return attrs.href || '';
  };
  
  // Handle link button click
  const handleLinkClick = () => {
    setShowLinkPopover(true);
  };
  
  // Apply link from popover
  const handleApplyLink = (url: string) => {
    if (url) {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .unsetLink()
        .run();
    }
  };
  
  // Handle attachment click
  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newAttachments: AttachedFile[] = Array.from(files).map(file => ({
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      file: file,
      status: 'pending' as const,
      progress: 0
    }));
    
    if (onAttachmentsChange) {
      onAttachmentsChange([...attachments, ...newAttachments]);
    }
    
    // Reset input so same file can be selected again
    e.target.value = '';
  };
  
  const isLinkActive = editor.isActive('link');
  
  return (
    <div className="border-t border-zinc-700/30 bg-[#2d2d2d]">
      {/* Main Toolbar - Icons only */}
      <div className="flex items-center px-3 py-2">
        {/* Text Formatting Group */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          tooltip="Bold"
          shortcut={`${cmdKey}+B`}
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          tooltip="Italic"
          shortcut={`${cmdKey}+I`}
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          tooltip="Underline"
          shortcut={`${cmdKey}+U`}
        >
          <Underline className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarDivider />
        
        {/* List Group */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          tooltip="Bullet List"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          tooltip="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarDivider />
        
        {/* Link */}
        <div className="relative">
          <ToolbarButton
            onClick={handleLinkClick}
            isActive={isLinkActive}
            tooltip={isLinkActive ? "Edit Link" : "Insert Link"}
            shortcut={`${cmdKey}+K`}
          >
            {isLinkActive ? (
              <Link2Off className="w-4 h-4" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
          </ToolbarButton>
          
          <LinkPopover
            isOpen={showLinkPopover}
            onClose={() => setShowLinkPopover(false)}
            onApply={handleApplyLink}
            initialUrl={getCurrentLinkUrl()}
          />
        </div>
        
        <ToolbarDivider />
        
        {/* Attachment */}
        <ToolbarButton
          onClick={handleAttachmentClick}
          tooltip="Attach file"
        >
          <Paperclip className="w-4 h-4" />
        </ToolbarButton>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          accept="*/*"
        />
      </div>
    </div>
  );
}