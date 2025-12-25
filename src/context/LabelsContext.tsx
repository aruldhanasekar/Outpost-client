// context/LabelsContext.tsx
// Global context for labels - persists across page navigation

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

interface Label {
  id: string;
  name: string;
  display_name: string;
  type: string;
  threads_count?: number;
  color?: string;
  auto_label?: boolean;
  auto_label_emails?: string[];
}

interface LabelsContextType {
  labels: Label[];
  loading: boolean;
  hasFetched: boolean;
  fetchLabels: () => Promise<void>;
  refreshLabels: () => Promise<void>;
  removeLabel: (labelId: string) => void;
  updateLabelInState: (labelId: string, updates: Partial<Label>) => void;
}

const LabelsContext = createContext<LabelsContextType | undefined>(undefined);

export function LabelsProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch labels from API
  const fetchLabels = useCallback(async () => {
    if (!currentUser) return;
    
    // Don't fetch if already fetched
    if (hasFetched && labels.length > 0) return;
    
    setLoading(true);
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
        setLabels(data.labels || []);
      }
    } catch (err) {
      console.error('Error fetching labels:', err);
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  }, [currentUser, hasFetched, labels.length]);

  // Force refresh labels (after create/update/delete)
  const refreshLabels = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
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
        setLabels(data.labels || []);
      }
    } catch (err) {
      console.error('Error refreshing labels:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Remove label from local state (optimistic update)
  const removeLabel = useCallback((labelId: string) => {
    setLabels(prev => prev.filter(l => l.id !== labelId));
  }, []);

  // Update label in local state (optimistic update)
  const updateLabelInState = useCallback((labelId: string, updates: Partial<Label>) => {
    setLabels(prev => prev.map(l => 
      l.id === labelId ? { ...l, ...updates } : l
    ));
  }, []);

  // Reset state when user changes
  useEffect(() => {
    if (!currentUser) {
      setLabels([]);
      setHasFetched(false);
    }
  }, [currentUser]);

  return (
    <LabelsContext.Provider value={{
      labels,
      loading,
      hasFetched,
      fetchLabels,
      refreshLabels,
      removeLabel,
      updateLabelInState
    }}>
      {children}
    </LabelsContext.Provider>
  );
}

export function useLabels() {
  const context = useContext(LabelsContext);
  if (context === undefined) {
    throw new Error('useLabels must be used within a LabelsProvider');
  }
  return context;
}

export default LabelsContext;