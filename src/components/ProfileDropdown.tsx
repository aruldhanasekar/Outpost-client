// components/ProfileDropdown.tsx
// Reusable profile avatar dropdown for all pages
// v2.0: Light theme with brand green hover
// v2.1: Add account - Coming soon tooltip
// v2.2: Support for profile picture (avatarUrl)

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings, UserPlus } from "lucide-react";
import { logOut } from "@/services/auth.service";

interface ProfileDropdownProps {
  userEmail: string;
  userName?: string;
  avatarLetter: string;
  avatarUrl?: string;
}

const ProfileDropdown = ({ userEmail, userName, avatarLetter, avatarUrl }: ProfileDropdownProps) => {
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
      await logOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSettings = () => {
    setIsOpen(false);
    navigate("/settings");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 transition-colors"
      >
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt={userName || "User"} 
            className="w-8 h-8 rounded-full object-cover hover:ring-2 hover:ring-gray-300 transition-all"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#8FA8A3] flex items-center justify-center text-sm font-medium text-black hover:ring-2 hover:ring-gray-300 transition-all">
            {avatarLetter}
          </div>
        )}
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
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={userName || "User"} 
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#8FA8A3] flex items-center justify-center text-base font-semibold text-black flex-shrink-0">
                  {avatarLetter}
                </div>
              )}
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
            {/* Add Account - Coming Soon */}
            <div className="relative group/add">
              <button
                disabled
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 cursor-not-allowed"
              >
                <UserPlus className="w-4 h-4" />
                <span className="text-sm">Add account</span>
              </button>
              {/* Coming Soon Tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2.5 py-1.5 bg-zinc-900 text-white text-xs rounded-lg opacity-0 group-hover/add:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
                Coming soon
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-900" />
              </div>
            </div>

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