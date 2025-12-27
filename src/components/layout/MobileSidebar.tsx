// components/layout/MobileSidebar.tsx
// Mobile sidebar component with navigation, labels, and profile
// v1.0: Extracted from Inbox.tsx with added Labels section and profile at bottom

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SendHorizontal, Plus, Trash2 } from "lucide-react";
import { User } from "firebase/auth";
import { useLabels } from "@/context/LabelsContext";
import { CreateLabelModal } from "@/components/labels/CreateLabelModal";
import { DeleteLabelModal } from "@/components/labels/DeleteLabelModal";
import { SenderRulesModal } from "@/components/rules/SenderRulesModal";
import { deleteLabel } from "@/services/emailApi";
import { UserProfile } from "@/types/user.types";

// Outpost logo
import OutpostLogo from "@/assets/Outpost.png";

export type MobilePageType = 'inbox' | 'sent' | 'drafts' | 'done' | 'scheduled' | 'trash' | 'label';

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
        <div className="p-4 border-b border-zinc-800">
          <button 
            onClick={() => setIsSenderRulesOpen(true)}
            className="p-2 bg-white rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <img 
              src={OutpostLogo} 
              alt="Outpost" 
              className="w-7 h-7"
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-colors ${
                  activePage === 'inbox' 
                    ? 'text-white bg-zinc-800/50' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5 flex-shrink-0" fill="currentColor">
                  <path d="M155.8 96C123.9 96 96.9 119.4 92.4 150.9L64.6 345.2C64.2 348.2 64 351.2 64 354.3L64 480C64 515.3 92.7 544 128 544L512 544C547.3 544 576 515.3 576 480L576 354.3C576 351.3 575.8 348.2 575.4 345.2L547.6 150.9C543.1 119.4 516.1 96 484.2 96L155.8 96zM155.8 160L484.3 160L511.7 352L451.8 352C439.7 352 428.6 358.8 423.2 369.7L408.9 398.3C403.5 409.1 392.4 416 380.3 416L259.9 416C247.8 416 236.7 409.2 231.3 398.3L217 369.7C211.6 358.9 200.5 352 188.4 352L128.3 352L155.8 160z"/>
                </svg>
                <span className="text-sm font-medium">Inbox</span>
              </button>

              {/* Sent */}
              <button 
                onClick={() => handleNavigate('/sent')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-colors ${
                  activePage === 'sent' 
                    ? 'text-white bg-zinc-800/50' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                }`}
              >
                <SendHorizontal className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">Sent</span>
              </button>

              {/* Drafts */}
              <button 
                onClick={() => handleNavigate('/drafts')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-colors ${
                  activePage === 'drafts' 
                    ? 'text-white bg-zinc-800/50' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5 flex-shrink-0" fill="currentColor">
                  <path d="M128 128C128 92.7 156.7 64 192 64L341.5 64C358.5 64 374.8 70.7 386.8 82.7L493.3 189.3C505.3 201.3 512 217.6 512 234.6L512 512C512 547.3 483.3 576 448 576L192 576C156.7 576 128 547.3 128 512L128 128zM336 122.5L336 216C336 229.3 346.7 240 360 240L453.5 240L336 122.5zM192 136C192 149.3 202.7 160 216 160L264 160C277.3 160 288 149.3 288 136C288 122.7 277.3 112 264 112L216 112C202.7 112 192 122.7 192 136zM192 232C192 245.3 202.7 256 216 256L264 256C277.3 256 288 245.3 288 232C288 218.7 277.3 208 264 208L216 208C202.7 208 192 218.7 192 232zM256 304L224 304C206.3 304 192 318.3 192 336L192 384C192 410.5 213.5 432 240 432C266.5 432 288 410.5 288 384L288 336C288 318.3 273.7 304 256 304zM240 368C248.8 368 256 375.2 256 384C256 392.8 248.8 400 240 400C231.2 400 224 392.8 224 384C224 375.2 231.2 368 240 368z"/>
                </svg>
                <span className="text-sm font-medium">Drafts</span>
              </button>

              {/* Done */}
              <button 
                onClick={() => handleNavigate('/done')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-colors ${
                  activePage === 'done' 
                    ? 'text-white bg-zinc-800/50' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5 flex-shrink-0" fill="currentColor">
                  <path d="M530.8 134.1C545.1 144.5 548.3 164.5 537.9 178.8L281.9 530.8C276.4 538.4 267.9 543.1 258.5 543.9C249.1 544.7 240 541.2 233.4 534.6L105.4 406.6C92.9 394.1 92.9 373.8 105.4 361.3C117.9 348.8 138.2 348.8 150.7 361.3L252.2 462.8L486.2 141.1C496.6 126.8 516.6 123.6 530.9 134z"/>
                </svg>
                <span className="text-sm font-medium">Done</span>
              </button>

              {/* Scheduled */}
              <button 
                onClick={() => handleNavigate('/scheduled')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-colors ${
                  activePage === 'scheduled' 
                    ? 'text-white bg-zinc-800/50' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5 flex-shrink-0" fill="currentColor">
                  <path d="M320 0C496.7 0 640 143.3 640 320C640 496.7 496.7 640 320 640C143.3 640 0 496.7 0 320C0 143.3 143.3 0 320 0ZM290 150V320C290 330 295 339.4 303.4 345L423.4 425C437.1 434.2 455.6 430.5 464.9 416.9C474.1 403.2 470.5 384.7 456.8 375.4L350 304.9V150C350 133.4 336.6 120 320 120C303.4 120 290 133.4 290 150Z"/>
                </svg>
                <span className="text-sm font-medium">Scheduled</span>
              </button>

              {/* Trash */}
              <button 
                onClick={() => handleNavigate('/trash')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-colors ${
                  activePage === 'trash' 
                    ? 'text-white bg-zinc-800/50' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5 flex-shrink-0" fill="currentColor">
                  <path d="M232.7 69.9L224 96L128 96C110.3 96 96 110.3 96 128C96 145.7 110.3 160 128 160L512 160C529.7 160 544 145.7 544 128C544 110.3 529.7 96 512 96L416 96L407.3 69.9C402.9 56.8 390.7 48 376.9 48L263.1 48C249.3 48 237.1 56.8 232.7 69.9zM512 208L128 208L149.1 531.1C150.7 556.4 171.7 576 197 576L443 576C468.3 576 489.3 556.4 490.9 531.1L512 208z"/>
                </svg>
                <span className="text-sm font-medium">Trash</span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-4 border-t border-zinc-800" />

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
          className="p-4 border-t border-zinc-800 cursor-pointer hover:bg-zinc-800/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#f7ac5c] flex items-center justify-center text-base font-semibold text-black flex-shrink-0">
              {avatarLetter}
            </div>
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