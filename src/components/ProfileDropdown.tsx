// components/ProfileDropdown.tsx
// Reusable profile avatar dropdown for all pages
// v2.0: Light theme with brand green hover

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings, UserPlus } from "lucide-react";
import { logOut } from "@/services/auth.service";

interface ProfileDropdownProps {
  userEmail: string;
  userName?: string;
  avatarLetter: string;
}

const ProfileDropdown = ({ userEmail, userName, avatarLetter }: ProfileDropdownProps) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    try {
      // Check if in demo mode
      const isDemoMode = localStorage.getItem('demo_mode') === 'true';
      
      // Clear demo mode flag
      localStorage.removeItem('demo_mode');
      
      // In demo mode, force full page reload to reset AuthContext
      if (isDemoMode) {
        window.location.href = '/';
        return;
      }
      
      await logOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
      // Still redirect even if error
      navigate("/");
    }
  };

  const handleSettings = () => {
    setIsOpen(false);
    navigate("/settings");
  };

  const handleAddAccount = () => {
    // TODO: Implement add account functionality
    console.log("Add account clicked - feature coming soon");
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-[#8FA8A3] flex items-center justify-center text-sm font-medium text-black hover:ring-2 hover:ring-gray-300 transition-all">
          {avatarLetter}
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute bottom-0 left-full ml-2 w-64 bg-[#f7f7f7] border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-fadeIn"
          onMouseLeave={() => setIsOpen(false)}
        >
          {/* Profile Info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#8FA8A3] flex items-center justify-center text-base font-semibold text-black flex-shrink-0">
                {avatarLetter}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-black text-sm font-medium truncate">
                  {userName || "User"}
                </span>
                <span className="text-gray-500 text-xs truncate">
                  {userEmail}
                </span>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            {/* Add Account */}
            <button
              onClick={handleAddAccount}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:text-black hover:bg-[#e1f7f0] transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span className="text-sm">Add account</span>
            </button>

            {/* Settings */}
            <button
              onClick={handleSettings}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:text-black hover:bg-[#e1f7f0] transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Settings</span>
            </button>

            {/* Divider */}
            <div className="my-2 border-t border-gray-200" />

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:text-black hover:bg-[#e1f7f0] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;