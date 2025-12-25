// components/layout/Sidebar.tsx
// Desktop sidebar - White sidebar with mail icon and expandable navigation panel

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import ProfileDropdown from "@/components/ProfileDropdown";
import { useAuth } from "@/context/AuthContext";
import { CreateLabelModal } from "@/components/labels/CreateLabelModal";
import { DeleteLabelModal } from "@/components/labels/DeleteLabelModal";

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export type PageType = 'inbox' | 'sent' | 'drafts' | 'done' | 'scheduled' | 'trash' | 'label';

interface Label {
  id: string;
  name: string;
  display_name: string;
  type: string;
  threads_count?: number;
}

interface SidebarProps {
  activePage: PageType;
  activeLabel?: string;
  userEmail?: string;
  userName?: string;
  avatarLetter?: string;
}

// Menu items configuration
const menuItems: { id: PageType; label: string; path: string }[] = [
  { id: 'inbox', label: 'Inbox', path: '/inbox' },
  { id: 'sent', label: 'Sent', path: '/sent' },
  { id: 'drafts', label: 'Drafts', path: '/drafts' },
  { id: 'done', label: 'Done', path: '/done' },
  { id: 'scheduled', label: 'Scheduled', path: '/scheduled' },
  { id: 'trash', label: 'Trash', path: '/trash' },
];

export const Sidebar = ({ activePage, activeLabel, userEmail, userName, avatarLetter }: SidebarProps) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [labels, setLabels] = useState<Label[]>([]);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [hasFetchedLabels, setHasFetchedLabels] = useState(false);
  const [isCreateLabelOpen, setIsCreateLabelOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; label: Label | null }>({
    isOpen: false,
    label: null
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch labels from API
  const fetchLabels = async () => {
    if (!currentUser) return;
    
    setLabelsLoading(true);
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
      setLabelsLoading(false);
      setHasFetchedLabels(true);
    }
  };

  // Fetch labels when nav opens (only first time)
  useEffect(() => {
    if (isNavOpen && !hasFetchedLabels) {
      fetchLabels();
    }
  }, [currentUser, isNavOpen, hasFetchedLabels]);

  // Handle delete label
  const handleDeleteLabel = async (labelId: string) => {
    if (!currentUser) return;
    
    setIsDeleting(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_URL}/api/labels/${labelId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Remove from local state
        setLabels(prev => prev.filter(l => l.id !== labelId));
        setDeleteModal({ isOpen: false, label: null });
      } else {
        console.error('Failed to delete label');
      }
    } catch (err) {
      console.error('Error deleting label:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle menu item click
  const handleMenuItemClick = (path: string) => {
    navigate(path);
    setIsNavOpen(false);
  };

  // Handle label click
  const handleLabelClick = (labelName: string) => {
    navigate(`/label/${encodeURIComponent(labelName)}`);
    setIsNavOpen(false);
  };

  // Handle mouse leave - close nav
  const handleMouseLeave = () => {
    setIsNavOpen(false);
  };

  // Close nav when mouse leaves the document/window
  useEffect(() => {
    const handleDocumentMouseLeave = (e: MouseEvent) => {
      // Check if mouse left the document
      if (e.clientY <= 0 || e.clientX <= 0 || 
          e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setIsNavOpen(false);
      }
    };

    document.addEventListener('mouseleave', handleDocumentMouseLeave);
    return () => {
      document.removeEventListener('mouseleave', handleDocumentMouseLeave);
    };
  }, []);

  return (
    <>
      {/* Desktop: First Sidebar - Strip with Mail Icon */}
      <div className="hidden lg:flex fixed top-0 bottom-0 left-0 w-12 bg-[#2d2d2d] rounded-r-2xl flex-col items-center pt-4 z-30">
        
        {/* Mail Icon */}
        <button 
          onMouseEnter={() => setIsNavOpen(true)}
          className="p-2.5 text-[#8FA8A3]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-8 h-7" fill="currentColor">
            <path d="M112 128C85.5 128 64 149.5 64 176C64 191.1 71.1 205.3 83.2 214.4L291.2 370.4C308.3 383.2 331.7 383.2 348.8 370.4L556.8 214.4C568.9 205.3 576 191.1 576 176C576 149.5 554.5 128 528 128L112 128zM64 260L64 448C64 483.3 92.7 512 128 512L512 512C547.3 512 576 483.3 576 448L576 260L377.6 408.8C343.5 434.4 296.5 434.4 262.4 408.8L64 260z"/>
          </svg>
        </button>

        {/* Spacer to push profile to bottom */}
        <div className="flex-1" />

        {/* Profile Avatar */}
        <div className="mb-4">
          <ProfileDropdown
            userEmail={userEmail || ""}
            userName={userName}
            avatarLetter={avatarLetter || "U"}
          />
        </div>

      </div>

      {/* Desktop: Second Sidebar - Navigation Panel */}
      {isNavOpen && (
        <div 
          className="hidden lg:block fixed top-4 bottom-20 left-14 w-[200px] bg-[#f7f7f7] rounded-2xl z-20 shadow-xl py-3 overflow-y-auto"
          onMouseLeave={handleMouseLeave}
        >
          <nav className="px-2">
            {/* Main Menu Items */}
            {menuItems.map((item) => {
              const isActive = activePage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuItemClick(item.path)}
                  className={`
                    w-full flex items-center px-4 py-2.5 rounded-full mb-1 text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-[#8FA8A3] text-black' 
                      : 'text-gray-700 hover:bg-gray-200 hover:text-[#8FA8A3]'
                    }
                  `}
                >
                  {item.label}
                </button>
              );
            })}
            
            {/* Divider */}
            <div className="my-3 mx-2 border-t border-gray-300" />
            
            {/* Labels Section Header */}
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Labels
              </span>
              <div className="relative group">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCreateLabelOpen(true);
                  }}
                  className="p-1 text-gray-400 hover:text-[#8FA8A3] hover:bg-gray-200 rounded transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Create label
                </div>
              </div>
            </div>
            
            {/* Labels Loading State */}
            {labelsLoading && (
              <div className="px-4 py-2 text-sm text-gray-400">
                Loading...
              </div>
            )}
            
            {/* Label Items */}
            {!labelsLoading && labels.length === 0 && (
              <div className="px-4 py-2 text-sm text-gray-400">
                No labels
              </div>
            )}
            
            {!labelsLoading && labels.map((label) => {
              const isActive = activePage === 'label' && activeLabel?.toLowerCase() === label.display_name.toLowerCase();
              
              return (
                <div
                  key={label.id}
                  className={`
                    group/label w-full flex items-center justify-between px-4 py-2.5 rounded-full mb-1 text-sm font-medium transition-colors cursor-pointer
                    ${isActive 
                      ? 'bg-[#8FA8A3] text-black' 
                      : 'text-gray-700 hover:bg-gray-200 hover:text-[#8FA8A3]'
                    }
                  `}
                  onClick={() => handleLabelClick(label.display_name)}
                >
                  <span className="truncate">{label.display_name}</span>
                  <div className="flex items-center gap-1">
                    {label.threads_count !== undefined && label.threads_count > 0 && (
                      <span className={`text-xs ${isActive ? 'text-black/60' : 'text-gray-400'} group-hover/label:hidden`}>
                        {label.threads_count}
                      </span>
                    )}
                    {/* Delete button - show on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteModal({ isOpen: true, label });
                      }}
                      className={`p-1 rounded opacity-0 group-hover/label:opacity-100 transition-opacity ${
                        isActive 
                          ? 'hover:bg-black/10 text-black/60 hover:text-black' 
                          : 'hover:bg-gray-300 text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
      )}
      
      {/* Create Label Modal */}
      <CreateLabelModal
        isOpen={isCreateLabelOpen}
        onClose={() => setIsCreateLabelOpen(false)}
        onLabelCreated={fetchLabels}
      />
      
      {/* Delete Label Modal */}
      {deleteModal.label && (
        <DeleteLabelModal
          isOpen={deleteModal.isOpen}
          labelName={deleteModal.label.display_name}
          labelId={deleteModal.label.id}
          onClose={() => setDeleteModal({ isOpen: false, label: null })}
          onConfirm={handleDeleteLabel}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
};

export default Sidebar;