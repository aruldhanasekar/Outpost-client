import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, LogOut, Trash2, ChevronDown, X, AlertTriangle } from "lucide-react";
import { logOut } from "@/services/auth.service";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase.config";

// API URL from environment
const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

// List of all timezones
const TIMEZONES = [
  "Africa/Abidjan",
  "Africa/Accra",
  "Africa/Addis_Ababa",
  "Africa/Algiers",
  "Africa/Cairo",
  "Africa/Casablanca",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Nairobi",
  "America/Anchorage",
  "America/Argentina/Buenos_Aires",
  "America/Bogota",
  "America/Chicago",
  "America/Denver",
  "America/Halifax",
  "America/Lima",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/New_York",
  "America/Phoenix",
  "America/Santiago",
  "America/Sao_Paulo",
  "America/Toronto",
  "America/Vancouver",
  "Asia/Baghdad",
  "Asia/Bangkok",
  "Asia/Colombo",
  "Asia/Dubai",
  "Asia/Hong_Kong",
  "Asia/Istanbul",
  "Asia/Jakarta",
  "Asia/Jerusalem",
  "Asia/Karachi",
  "Asia/Kathmandu",
  "Asia/Kolkata",
  "Asia/Kuala_Lumpur",
  "Asia/Kuwait",
  "Asia/Manila",
  "Asia/Riyadh",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Taipei",
  "Asia/Tehran",
  "Asia/Tokyo",
  "Atlantic/Reykjavik",
  "Australia/Adelaide",
  "Australia/Brisbane",
  "Australia/Darwin",
  "Australia/Melbourne",
  "Australia/Perth",
  "Australia/Sydney",
  "Europe/Amsterdam",
  "Europe/Athens",
  "Europe/Belgrade",
  "Europe/Berlin",
  "Europe/Brussels",
  "Europe/Bucharest",
  "Europe/Budapest",
  "Europe/Copenhagen",
  "Europe/Dublin",
  "Europe/Helsinki",
  "Europe/Kiev",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Moscow",
  "Europe/Oslo",
  "Europe/Paris",
  "Europe/Prague",
  "Europe/Rome",
  "Europe/Stockholm",
  "Europe/Vienna",
  "Europe/Warsaw",
  "Europe/Zurich",
  "Pacific/Auckland",
  "Pacific/Fiji",
  "Pacific/Guam",
  "Pacific/Honolulu",
  "Pacific/Midway",
  "Pacific/Samoa",
  "UTC"
];

const Settings = () => {
  const { currentUser, userProfile, loading: authLoading, refreshUserProfile } = useAuth();
  const navigate = useNavigate();
  
  const [selectedTimezone, setSelectedTimezone] = useState<string>("");
  const [isTimezoneDropdownOpen, setIsTimezoneDropdownOpen] = useState(false);
  const [isSavingTimezone, setIsSavingTimezone] = useState(false);

  // Delete account state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Set initial timezone from user profile
  useEffect(() => {
    if (userProfile?.timezone) {
      setSelectedTimezone(userProfile.timezone);
    } else {
      setSelectedTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
  }, [userProfile]);

  const handleSignOut = async () => {
    try {
      await logOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleTimezoneChange = async (timezone: string) => {
    setSelectedTimezone(timezone);
    setIsTimezoneDropdownOpen(false);
    
    if (!currentUser) return;
    
    setIsSavingTimezone(true);
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        timezone: timezone,
        lastActivity: new Date().toISOString()
      });
      console.log('✅ Timezone updated to:', timezone);
      // Refresh user profile to get updated data
      if (refreshUserProfile) {
        await refreshUserProfile();
      }
    } catch (error) {
      console.error('❌ Error updating timezone:', error);
    } finally {
      setIsSavingTimezone(false);
    }
  };

  // Delete account handler
  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    
    const userEmail = userProfile?.email || currentUser?.email || "";
    
    // Verify confirmation text matches email
    if (deleteConfirmText !== userEmail) {
      setDeleteError("Email doesn't match. Please type your email exactly.");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      // Get Firebase ID token
      const token = await currentUser.getIdToken();

      // Call delete account API
      const response = await fetch(`${API_URL}/api/account/delete`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();

      if (response.ok && (data.status === "success" || data.status === "partial")) {
        console.log("✅ Account deleted successfully:", data);
        
        // Sign out and redirect to home
        await logOut();
        navigate("/");
      } else {
        throw new Error(data.message || "Failed to delete account");
      }
    } catch (error) {
      console.error("❌ Error deleting account:", error);
      setDeleteError(error instanceof Error ? error.message : "Failed to delete account. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Auth check
  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate("/");
    }
  }, [currentUser, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#2e2d2d] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const userEmail = userProfile?.email || currentUser?.email || "";

  return (
    <div className="h-screen bg-[#2e2d2d] text-white overflow-hidden">
      <div className="flex h-screen w-full overflow-hidden">
        {/* Left Sidebar - Back Arrow and Profile */}
        <div className="hidden lg:flex flex-col items-center py-4 border-r border-zinc-700 bg-[#2e2d2d] w-12 flex-shrink-0">
          <button
            onClick={() => navigate("/inbox")}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800/50 hover:text-white transition-colors"
            title="Back to Inbox"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          {/* Spacer */}
          <div className="flex-1" />
          
          {/* Profile Avatar */}
          <div 
            className="w-8 h-8 rounded-full bg-[#8FA8A3] flex items-center justify-center text-xs font-medium cursor-pointer text-black"
            title={`${userProfile?.firstName} ${userProfile?.lastName}`}
          >
            {userProfile?.firstName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || "U"}
          </div>
        </div>

        {/* Main Content - Settings */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <div className="border-b border-zinc-700 bg-[#2e2d2d] p-4">
            <div className="flex items-center gap-3">
              {/* Mobile back button */}
              <button
                onClick={() => navigate("/inbox")}
                className="lg:hidden p-2 hover:bg-zinc-700/50 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold">General</h1>
            </div>
          </div>

          {/* Settings Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Account Section */}
              <div className="bg-zinc-800/50 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Account</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">Name</p>
                      <p className="text-sm text-zinc-400">
                        {userProfile?.firstName} {userProfile?.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t border-zinc-700">
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-zinc-400">
                        {userEmail}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preferences Section */}
              <div className="bg-zinc-800/50 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Preferences</h2>
                <div className="space-y-4">
                  <div className="py-2">
                    <p className="font-medium mb-2">Timezone</p>
                    <div className="relative">
                      <button
                        onClick={() => setIsTimezoneDropdownOpen(!isTimezoneDropdownOpen)}
                        className="w-full flex items-center justify-between bg-[#2e2d2d] border border-zinc-600 rounded-lg px-4 py-3 text-left hover:border-zinc-500 transition-colors"
                        disabled={isSavingTimezone}
                      >
                        <span className="text-sm text-zinc-300">
                          {isSavingTimezone ? "Saving..." : selectedTimezone}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isTimezoneDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {/* Timezone Dropdown */}
                      {isTimezoneDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#2e2d2d] border border-zinc-600 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                          {TIMEZONES.map((timezone) => (
                            <button
                              key={timezone}
                              onClick={() => handleTimezoneChange(timezone)}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-700/50 transition-colors ${
                                selectedTimezone === timezone ? 'bg-zinc-700 text-[#8FA8A3]' : 'text-zinc-300'
                              }`}
                            >
                              {timezone}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sign Out Section */}
              <div className="bg-zinc-800/50 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Session</h2>
                <div className="space-y-4">
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-zinc-800/50 rounded-lg p-6 border border-red-900/50">
                <h2 className="text-lg font-semibold mb-4 text-red-400">Danger Zone</h2>
                <div className="space-y-4">
                  <p className="text-sm text-zinc-400 mb-3">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Click outside to close timezone dropdown */}
        {isTimezoneDropdownOpen && (
          <div
            onClick={() => setIsTimezoneDropdownOpen(false)}
            className="fixed inset-0 z-40"
          />
        )}

        {/* Delete Account Confirmation Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/70"
              onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
            />
            
            {/* Modal */}
            <div className="relative bg-[#2e2d2d] rounded-xl shadow-2xl w-full max-w-md mx-4 border border-zinc-700">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Delete Account</h3>
                </div>
                <button
                  onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
                  className="p-1 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-white"
                  disabled={isDeleting}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                <div className="text-sm text-zinc-300 space-y-3">
                  <p>
                    This action <span className="text-red-400 font-semibold">cannot be undone</span>. This will permanently delete:
                  </p>
                  <ul className="list-disc list-inside text-zinc-400 space-y-1 ml-2">
                    <li>All your emails and threads</li>
                    <li>Your Gmail connection</li>
                    <li>All attachments</li>
                    <li>Your account and profile</li>
                  </ul>
                </div>

                <div className="pt-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Type <span className="text-red-400 font-mono">{userEmail}</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => {
                      setDeleteConfirmText(e.target.value);
                      setDeleteError(null);
                    }}
                    placeholder="Enter your email"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    disabled={isDeleting}
                    autoComplete="off"
                  />
                </div>

                {/* Error Message */}
                {deleteError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {deleteError}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-zinc-700">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteConfirmText("");
                    setDeleteError(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || deleteConfirmText !== userEmail}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                    deleteConfirmText === userEmail && !isDeleting
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Account
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;