import { logOut } from "@/services/auth.service";
import { UserProfile as UserProfileType } from "@/types/user.types";

interface UserProfileProps {
  userProfile: UserProfileType;
}

const UserProfile = ({ userProfile }: UserProfileProps) => {
  const handleSignOut = async () => {
    try {
      await logOut();
    } catch (error) {
      console.error("Error signing out:", error);
      alert("Failed to sign out. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="text-center space-y-8 max-w-2xl mx-auto">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
          Welcome back, {userProfile.firstName}!
        </h1>
        
        <div className="bg-white/40 backdrop-blur-md border border-white/50 rounded-2xl p-6 space-y-3">
          <p className="text-lg">
            <span className="font-semibold">Name:</span> {userProfile.firstName} {userProfile.lastName}
          </p>
          <p className="text-lg">
            <span className="font-semibold">Email:</span> {userProfile.email}
          </p>
          <p className="text-lg">
            <span className="font-semibold">UID:</span> {userProfile.uid}
          </p>
          <p className="text-sm text-gray-600">
            Member since: {userProfile.createdAt.toLocaleDateString()}
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="bg-white/40 backdrop-blur-md text-[#3c4043] hover:bg-white/60 border border-white/50 font-medium px-6 py-3 text-lg rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default UserProfile;