// context/ComposeContext.tsx
// Global compose modal state management
// Allows compose modal to persist across page navigation

import React, { createContext, useContext, useState, useCallback } from 'react';
import { AttachedFile } from '@/components/inbox/TiptapEditor';
import { UndoEmailData } from '@/components/inbox/ComposeModal';

// Types for compose data
export interface ComposeData {
  // Edit mode (for scheduled emails)
  editMode?: boolean;
  editEmailId?: string;
  // Draft mode
  draftId?: string;
  // Initial values
  initialTo?: string[];
  initialCc?: string[];
  initialBcc?: string[];
  initialSubject?: string;
  initialBody?: string;
  initialAttachments?: AttachedFile[];
  initialScheduledAt?: string;
}

interface ComposeContextType {
  // State
  isComposeOpen: boolean;
  composeData: ComposeData | null;
  
  // Actions
  openCompose: (data?: ComposeData) => void;
  closeCompose: () => void;
  
  // Callbacks (set by pages for their specific handling)
  onEmailSent: ((emailId: string, recipients: string[], emailData: UndoEmailData) => void) | null;
  onEmailScheduled: ((emailId: string, scheduledAt: Date, recipients: string[]) => void) | null;
  onDraftSaved: ((draftId: string) => void) | null;
  onDraftDeleted: ((draftId: string) => void) | null;
  onEmailUpdated: ((emailId: string) => void) | null;
  
  // Callback setters
  setOnEmailSent: (callback: ((emailId: string, recipients: string[], emailData: UndoEmailData) => void) | null) => void;
  setOnEmailScheduled: (callback: ((emailId: string, scheduledAt: Date, recipients: string[]) => void) | null) => void;
  setOnDraftSaved: (callback: ((draftId: string) => void) | null) => void;
  setOnDraftDeleted: (callback: ((draftId: string) => void) | null) => void;
  setOnEmailUpdated: (callback: ((emailId: string) => void) | null) => void;
}

const ComposeContext = createContext<ComposeContextType | undefined>(undefined);

export function ComposeProvider({ children }: { children: React.ReactNode }) {
  // Compose modal state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState<ComposeData | null>(null);
  
  // Callback states (pages register their callbacks)
  const [onEmailSent, setOnEmailSent] = useState<((emailId: string, recipients: string[], emailData: UndoEmailData) => void) | null>(null);
  const [onEmailScheduled, setOnEmailScheduled] = useState<((emailId: string, scheduledAt: Date, recipients: string[]) => void) | null>(null);
  const [onDraftSaved, setOnDraftSaved] = useState<((draftId: string) => void) | null>(null);
  const [onDraftDeleted, setOnDraftDeleted] = useState<((draftId: string) => void) | null>(null);
  const [onEmailUpdated, setOnEmailUpdated] = useState<((emailId: string) => void) | null>(null);

  // Open compose with optional data
  const openCompose = useCallback((data?: ComposeData) => {
    setComposeData(data || null);
    setIsComposeOpen(true);
  }, []);

  // Close compose
  const closeCompose = useCallback(() => {
    setIsComposeOpen(false);
    // Clear compose data after close
    setTimeout(() => {
      setComposeData(null);
    }, 300); // Wait for animation
  }, []);

  const value: ComposeContextType = {
    isComposeOpen,
    composeData,
    openCompose,
    closeCompose,
    onEmailSent,
    onEmailScheduled,
    onDraftSaved,
    onDraftDeleted,
    onEmailUpdated,
    setOnEmailSent,
    setOnEmailScheduled,
    setOnDraftSaved,
    setOnDraftDeleted,
    setOnEmailUpdated,
  };

  return (
    <ComposeContext.Provider value={value}>
      {children}
    </ComposeContext.Provider>
  );
}

// Hook to use compose context
export function useCompose() {
  const context = useContext(ComposeContext);
  if (context === undefined) {
    throw new Error('useCompose must be used within a ComposeProvider');
  }
  return context;
}

// Re-export UndoEmailData for convenience
export type { UndoEmailData } from '@/components/inbox/ComposeModal';