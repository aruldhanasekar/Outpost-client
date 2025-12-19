import { useState } from "react";
import { signInWithGoogle, getIdToken } from "@/services/auth.service";
import { getCurrentUserFromBackend } from "@/services/backend.service";

interface GoogleSignInButtonProps {
  onSuccess?: (backendUserData: any) => void;
  onError?: (error: Error) => void;
}

const GoogleSignInButton = ({ onSuccess, onError }: GoogleSignInButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // Step 1: Sign in with Google (Firebase)
      const profile = await signInWithGoogle();
      
      if (profile) {
        // Step 2: Get Firebase ID token
        const idToken = await getIdToken();
        console.log("🔑 TOKEN:", idToken);
        
        if (idToken) {
          try {
            // Step 3: Send token to backend
            const backendUserData = await getCurrentUserFromBackend(idToken);
            
            // Production-safe logging (no sensitive data)
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Backend response received');
              console.log('   UID:', backendUserData.uid);
              console.log('   Email:', backendUserData.email);
            }
            
            // Step 4: Call success callback with backend data
            if (onSuccess) {
              onSuccess(backendUserData);
            }
            
          } catch (backendError) {
            console.error('Backend verification failed');
            if (process.env.NODE_ENV === 'development') {
              console.error('Error details:', backendError);
            }
          }
        }
      }
    } catch (error) {
      console.error("Sign-in failed");
      if (process.env.NODE_ENV === 'development') {
        console.error('Error details:', error);
      }
      
      if (onError) {
        onError(error as Error);
      } else {
        alert("Failed to sign in. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      className="flex items-center justify-center gap-3 bg-white/40 backdrop-blur-md text-[#3c4043] hover:bg-white/60 border border-white/50 font-medium px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg md:text-xl rounded-full shadow-lg hover:shadow-xl transition-all mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ fontFamily: 'Roboto, arial, sans-serif' }}
    >
      {isLoading ? (
        <>
          <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-gray-300 border-t-[#3c4043] rounded-full animate-spin" />
          <span className="font-medium">Signing in...</span>
        </>
      ) : (
        <>
          <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          <span className="font-medium">Sign in with Google</span>
        </>
      )}
    </button>
  );
};

export default GoogleSignInButton;