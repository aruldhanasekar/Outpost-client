import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChange, getUserProfile, getIdToken, signInWithCustomFirebaseToken } from '../services/auth.service';
import { getCurrentUserFromBackend } from '../services/backend.service';
import { UserProfile } from '../types/user.types';
import { db } from '../firebase.config';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  backendUserData: any | null;
  loading: boolean;
  refreshUserProfile: (uid?: string) => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  backendUserData: null,
  loading: true,
  refreshUserProfile: async () => null,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [backendUserData, setBackendUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Demo mode configuration
  const DEMO_USER = {
    uid: 'AVS5YObxtBXgyIcGmSCewqiT0623',
    email: 'arul@useoutpostmail.com',
    emailVerified: true,
  } as User;

  // Capture and save user's timezone to Firestore (ONCE per session)
  const captureAndSaveTimezone = async (uid: string) => {
    if (!uid) return;
    
    // ✅ Guard: Only save once per session
    const sessionKey = `timezone_saved_${uid}`;
    if (sessionStorage.getItem(sessionKey)) {
      console.log('⏭️ Timezone already saved this session');
      return;
    }
    
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('🌍 Detected timezone:', timezone);
      
      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, {
        timezone: timezone,
        lastActivity: new Date().toISOString()
      });
      
      sessionStorage.setItem(sessionKey, '1');
      console.log('✅ Timezone saved to Firestore');
    } catch (error) {
      console.error('⚠️ Error saving timezone:', error);
      // Non-critical, continue anyway
    }
  };

  // Function to refresh user profile from Firestore
  const refreshUserProfile = async (uid?: string): Promise<UserProfile | null> => {
    const userUid = uid || currentUser?.uid;
    
    if (!userUid) {
      console.log('⚠️ Cannot refresh profile: No user UID');
      return null;
    }

    try {
      const profile = await getUserProfile(userUid);
      setUserProfile(profile);
      console.log('✅ User profile refreshed');
      return profile;
    } catch (error) {
      console.error('⚠️ Error refreshing user profile:', error);
      return null;
    }
  };

  // Handle OAuth success from popup
  const handleOAuthSuccess = async (customToken: string) => {
    try {
      console.log('🎯 Handling OAuth success...');
      
      // Sign in with custom token from backend
      const user = await signInWithCustomFirebaseToken(customToken);
      console.log('✅ User signed in:', user.uid);
      
      // Firebase auth state listener will pick this up
      // Save timezone in background
      captureAndSaveTimezone(user.uid);
      
    } catch (error) {
      console.error('❌ Error handling OAuth success:', error);
      throw error;
    }
  };

  // ==================== EFFECT 1: Demo Mode Check ====================
  // Check for demo mode on mount
  useEffect(() => {
    const isDemoMode = localStorage.getItem('demo_mode') === 'true';
    
    if (isDemoMode) {
      console.log('🎭 Demo mode detected - using demo user');
      setCurrentUser(DEMO_USER);
      setUserProfile({
        firstName: 'Arul',
        lastName: 'Dhanasekar',
        email: 'arul@useoutpostmail.com',
      } as UserProfile);
      setLoading(false);
    }
  }, []);

  // ==================== EFFECT 2: OAuth Message Listener ====================
  // ✅ CRITICAL: Empty dependency - mount ONCE
  useEffect(() => {
    console.log('🔌 Setting up OAuth message listener (ONCE)');
    
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_SUCCESS') {
        console.log('📨 Received OAuth success message');
        const { token } = event.data;
        
        try {
          await handleOAuthSuccess(token);
          console.log('🎉 OAuth flow completed successfully');
        } catch (error) {
          console.error('❌ Failed to complete OAuth flow:', error);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      console.log('🔌 Cleaning up OAuth listener');
      window.removeEventListener('message', handleMessage);
    };
  }, []); // ✅ Empty array - mount once, never re-attach

  // ==================== EFFECT 3: Auth State Listener ====================
  // ✅ Sets up Firebase auth listener ONCE
  // NO backend calls here!
  useEffect(() => {
    // Skip if demo mode
    if (localStorage.getItem('demo_mode') === 'true') {
      console.log('🎭 Demo mode - skipping Firebase auth listener');
      return;
    }

    console.log('🔐 Setting up auth state listener (ONCE)');
    
    const unsubscribe = onAuthStateChange(async (user) => {
      console.log('🔄 Auth state changed:', user ? `User ${user.uid.slice(0, 8)}...` : 'No user');
      
      // Update user state immediately
      setCurrentUser(user);
      
      if (!user) {
        // No user - clear everything
        setUserProfile(null);
        setBackendUserData(null);
        setLoading(false);
        console.log('👤 No user, loading complete');
        return;
      }
      
      // ✅ User exists - set loading false IMMEDIATELY
      setLoading(false);
      console.log('✅ User detected, loading complete');
      
      // Fetch profile in background (non-blocking)
      try {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
        console.log('✅ User profile loaded');
      } catch (error) {
        console.error('⚠️ Profile fetch failed:', error);
      }

      // Save timezone ONCE per session
      captureAndSaveTimezone(user.uid);
    });

    return () => {
      console.log('🔐 Cleaning up auth listener');
      unsubscribe();
    };
  }, []); // ✅ Empty array - setup once

  // ==================== EFFECT 4: Backend User Data Loader ====================
  // ✅ SEPARATED from auth listener - runs when currentUser changes
  useEffect(() => {
    const loadBackendUser = async () => {
      // Skip in demo mode
      if (localStorage.getItem('demo_mode') === 'true') {
        console.log('🎭 Demo mode - skipping backend data fetch');
        return;
      }

      if (!currentUser) {
        setBackendUserData(null);
        return;
      }

      // ✅ Guard: Prevent multiple concurrent calls
      const loadKey = `backend_loading_${currentUser.uid}`;
      if (sessionStorage.getItem(loadKey)) {
        console.log('⏭️ Backend data already loading/loaded');
        return;
      }

      sessionStorage.setItem(loadKey, '1');

      try {
        console.log('📡 Fetching backend user data...');
        const idToken = await getIdToken();
        
        if (!idToken) {
          console.error('⚠️ No ID token available');
          sessionStorage.removeItem(loadKey);
          return;
        }

        const backendData = await getCurrentUserFromBackend(idToken);
        setBackendUserData(backendData);
        console.log('✅ Backend data loaded');
        
      } catch (error) {
        console.error('⚠️ Backend fetch failed:', error);
        setBackendUserData(null);
        sessionStorage.removeItem(loadKey); // Allow retry on next mount
      }
    };

    loadBackendUser();
  }, [currentUser]); // ✅ Runs when user logs in/out

  const value = {
    currentUser,
    userProfile,
    backendUserData,
    loading,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};