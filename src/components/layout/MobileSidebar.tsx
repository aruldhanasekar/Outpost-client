// components/layout/MobileSidebar.tsx
// Mobile sidebar component with navigation, labels, and profile
// v1.0: Extracted from Inbox.tsx with added Labels section and profile at bottom
// v1.1: Added avatarUrl support for profile picture
// v1.2: Added Spam page to navigation

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { User } from "firebase/auth";
import { useLabels } from "@/context/LabelsContext";
import { CreateLabelModal } from "@/components/labels/CreateLabelModal";
import { DeleteLabelModal } from "@/components/labels/DeleteLabelModal";
import { SenderRulesModal } from "@/components/rules/SenderRulesModal";
import { deleteLabel } from "@/services/emailApi";
import { UserProfile } from "@/types/user.types";

// Outpost logo
import OutpostLogoWhite from "@/assets/OutpostMail_white_no_background.png";
import OutpostLogoDark from "@/assets/OutpostMail_dark_no_background.png";

export type MobilePageType = 'inbox' | 'sent' | 'drafts' | 'done' | 'scheduled' | 'trash' | 'spam' | 'label';

interface Label {
  id: string;
  name: string;
  display_name: string;
  type?: string;
  threads_count?: number;
}

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activePage: MobilePageType;
  activeLabel?: string;
  userProfile: UserProfile | null;
  currentUser: User | null;
}

export const MobileSidebar = ({
  isOpen,
  onClose,
  activePage,
  activeLabel,
  userProfile,
  currentUser
}: MobileSidebarProps) => {
  const navigate = useNavigate();
  const { labels, loading: labelsLoading, fetchLabels, refreshLabels, removeLabel } = useLabels();
  
  // Swipe gesture state
  const touchStartX = useRef<number>(0);
  const touchCurrentX = useRef<number>(0);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Modal states
  const [isSenderRulesOpen, setIsSenderRulesOpen] = useState(false);
  const [isCreateLabelOpen, setIsCreateLabelOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; label: Label | null }>({
    isOpen: false,
    label: null
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch labels when sidebar opens
  useEffect(() => {
    if (isOpen) {
      fetchLabels();
    }
  }, [isOpen, fetchLabels]);

  // Handle swipe gesture to close
  useEffect(() => {
    if (!isOpen) return;
    
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchCurrentX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      touchCurrentX.current = e.touches[0].clientX;
      const diff = touchStartX.current - touchCurrentX.current;
      
      // Only allow swiping left (to close)
      if (diff > 0) {
        sidebar.style.transform = `translateX(-${Math.min(diff, 288)}px)`;
      }
    };

    const handleTouchEnd = () => {
      const diff = touchStartX.current - touchCurrentX.current;
      
      // If swiped more than 100px, close the sidebar
      if (diff > 100) {
        onClose();
      }
      
      // Reset transform
      sidebar.style.transform = '';
    };

    sidebar.addEventListener('touchstart', handleTouchStart);
    sidebar.addEventListener('touchmove', handleTouchMove);
    sidebar.addEventListener('touchend', handleTouchEnd);

    return () => {
      sidebar.removeEventListener('touchstart', handleTouchStart);
      sidebar.removeEventListener('touchmove', handleTouchMove);
      sidebar.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, onClose]);

  // Handle delete label
  const handleDeleteLabel = async (labelId: string) => {
    if (!currentUser) return;
    
    setIsDeleting(true);
    try {
      await deleteLabel(labelId);
      removeLabel(labelId);
      setDeleteModal({ isOpen: false, label: null });
    } catch (err) {
      console.error('Error deleting label:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle navigation
  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  // Handle label click
  const handleLabelClick = (labelName: string) => {
    onClose();
    navigate(`/label/${encodeURIComponent(labelName)}`);
  };

  // Handle profile click - navigate to settings
  const handleProfileClick = () => {
    onClose();
    navigate('/settings');
  };

  // Get user display name
  const displayName = userProfile?.firstName && userProfile?.lastName
    ? `${userProfile.firstName} ${userProfile.lastName}`
    : userProfile?.firstName || currentUser?.displayName || 'User';

  // Get avatar letter
  const avatarLetter = userProfile?.firstName?.[0]?.toUpperCase() || 
                       currentUser?.email?.[0]?.toUpperCase() || 'U';

  // Get avatar URL from currentUser (Firebase Auth photoURL)
  const avatarUrl = currentUser?.photoURL || undefined;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={onClose}
        />
      )}

      {/* Slide-out Sidebar */}
      <div 
        ref={sidebarRef}
        className={`
          lg:hidden fixed top-0 left-0 bottom-0 w-72 bg-[#1a1a1a] z-50 
          transform transition-transform duration-300 ease-in-out flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header - Outpost Logo */}
        <div className="p-4">
          <button 
            onClick={() => setIsSenderRulesOpen(true)}
            className="group w-11 h-11 rounded-lg active:bg-white transition-all flex items-center justify-center"
          >
            {/* Default: white logo (visible on dark bg) */}
            <img 
              src={OutpostLogoWhite} 
              alt="Outpost" 
              className="w-9 h-9 object-contain absolute group-active:opacity-0 transition-opacity"
            />
            {/* Active/Pressed: dark logo (visible on white bg) */}
            <img 
              src={OutpostLogoDark} 
              alt="Outpost" 
              className="w-9 h-9 object-contain absolute opacity-0 group-active:opacity-100 transition-opacity"
            />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {/* Navigation Section */}
          <div className="p-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-3">
              Navigation
            </p>
            <div className="space-y-1">
              {/* Inbox */}
              <button 
                onClick={() => handleNavigate('/inbox')}
                className={`px-3 py-2.5 rounded-lg w-full text-left transition-colors ${
                  activePage === 'inbox' 
                    ? 'text-white bg-zinc-800/50' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                }`}
              >
                <span className="text-sm font-medium">Inbox</span>
              </button>

              {/* Sent */}
              <button 
                onClick={() => handleNavigate('/sent')}
                className={`px-3 py-2.5 rounded-lg w-full text-left transition-colors ${
                  activePage === 'sent' 
                    ? 'text-white bg-zinc-800/50' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                }`}
              >
                <span className="text-sm font-medium">Sent</span>
              </button>

              {/* Drafts */}
              <button 
                onClick={() => handleNavigate('/drafts')}
                className={`px-3 py-2.5 rounded-lg w-full text-left transition-colors ${
                  activePage === 'drafts' 
                    ? 'text-white bg-zinc-800/50' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                }`}
              >
                <span className="text-sm font-medium">Drafts</span>
              </button>

              {/* Done */}
              <button 
                onClick={() => handleNavigate('/done')}
                className={`px-3 py-2.5 rounded-lg w-full text-left transition-colors ${
                  activePage === 'done' 
                    ? 'text-white bg-zinc-800/50' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                }`}
              >
                <span className="text-sm font-medium">Done</span>
              </button>

              {/* Scheduled */}
              <button 
                onClick={() => handleNavigate('/scheduled')}
                className={`px-3 py-2.5 rounded-lg w-full text-left transition-colors ${
                  activePage === 'scheduled' 
                    ? 'text-white bg-zinc-800/50' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                }`}
              >
                <span className="text-sm font-medium">Scheduled</span>
              </button>

              {/* Trash */}
              <button 
                onClick={() => handleNavigate('/trash')}
                className={`px-3 py-2.5 rounded-lg w-full text-left transition-colors ${
                  activePage === 'trash' 
                    ? 'text-white bg-zinc-800/50' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                }`}
              >
                <span className="text-sm font-medium">Trash</span>
              </button>

              {/* Spam */}
              <button 
                onClick={() => handleNavigate('/spam')}
                className={`px-3 py-2.5 rounded-lg w-full text-left transition-colors ${
                  activePage === 'spam' 
                    ? 'text-white bg-zinc-800/50' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                }`}
              >
                <span className="text-sm font-medium">Spam</span>
              </button>
            </div>
          </div>

          {/* Labels Section */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3 px-3">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Labels
              </p>
              <button
                onClick={() => setIsCreateLabelOpen(true)}
                className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-1">
              {/* Labels Loading State */}
              {labelsLoading && labels.length === 0 && (
                <div className="px-3 py-2 text-sm text-zinc-500">
                  Loading...
                </div>
              )}
              
              {/* No Labels State */}
              {!labelsLoading && labels.length === 0 && (
                <div className="px-3 py-2 text-sm text-zinc-500">
                  No labels
                </div>
              )}
              
              {/* Label Items */}
              {labels.length > 0 && labels.map((label) => {
                const isActive = activePage === 'label' && activeLabel?.toLowerCase() === label.display_name.toLowerCase();
                
                return (
                  <div
                    key={label.id}
                    onClick={() => handleLabelClick(label.display_name)}
                    className={`
                      group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                      ${isActive 
                        ? 'text-white bg-zinc-800/50' 
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                      }
                    `}
                  >
                    <span className="text-sm font-medium truncate">{label.display_name}</span>
                    <div className="flex items-center gap-1">
                      {label.threads_count !== undefined && label.threads_count > 0 && (
                        <span className={`text-xs ${isActive ? 'text-zinc-300' : 'text-zinc-500'} group-hover:hidden`}>
                          {label.threads_count}
                        </span>
                      )}
                      {/* Delete button - show on hover (touch: always visible) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModal({ isOpen: true, label });
                        }}
                        className={`p-1 rounded transition-colors ${
                          isActive 
                            ? 'text-zinc-300 hover:text-white hover:bg-zinc-700' 
                            : 'text-zinc-500 hover:text-white hover:bg-zinc-700'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Profile Section - Fixed at Bottom */}
        <div 
          onClick={handleProfileClick}
          className="p-4 cursor-pointer hover:bg-zinc-800/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt={displayName} 
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#f7ac5c] flex items-center justify-center text-base font-semibold text-black flex-shrink-0">
                {avatarLetter}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-white text-sm font-medium truncate">
                {displayName}
              </span>
              <span className="text-zinc-500 text-xs truncate">
                {currentUser?.email || ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sender Rules Modal */}
      <SenderRulesModal
        isOpen={isSenderRulesOpen}
        onClose={() => setIsSenderRulesOpen(false)}
      />

      {/* Create Label Modal */}
      <CreateLabelModal
        isOpen={isCreateLabelOpen}
        onClose={() => setIsCreateLabelOpen(false)}
        onLabelCreated={refreshLabels}
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

export default MobileSidebar;