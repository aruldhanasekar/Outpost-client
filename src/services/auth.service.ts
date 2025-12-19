import { 
  signInWithPopup, 
  signInWithCustomToken,
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase.config';
import { UserProfile, UserProfileFirestore } from '../types/user.types';

/**
 * Sign in with Google and create/update user profile in Firestore
 * NOTE: This is now replaced by backend OAuth flow in Phase 1
 * Keeping for backwards compatibility
 */
export const signInWithGoogle = async (): Promise<UserProfile | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    if (!user || !user.email) {
      throw new Error('User email not found');
    }

    // Split display name into first and last name
    const fullName = user.displayName || '';
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const pictureUrl = user.photoURL || '';  // Get profile picture

    // Capture timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Check if user profile exists in Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    const now = new Date();

    if (userDoc.exists()) {
      // User exists, update last activity and timezone
      await updateDoc(userDocRef, {
        lastActivity: now.toISOString(),
        pictureUrl: pictureUrl,
        timezone: timezone  // Update timezone
      });

      const data = userDoc.data() as UserProfileFirestore;
      return {
        uid: data.uid,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        pictureUrl: data.pictureUrl || pictureUrl,
        timezone: data.timezone || timezone,  // Include timezone
        createdAt: new Date(data.createdAt),
        lastActivity: now
      };
    } else {
      // New user, create profile
      const newUserProfile: UserProfileFirestore = {
        uid: user.uid,
        firstName,
        lastName,
        email: user.email,
        pictureUrl: pictureUrl,
        timezone: timezone,  // Add timezone
        createdAt: now.toISOString(),
        lastActivity: now.toISOString()
      };

      await setDoc(userDocRef, newUserProfile);

      return {
        uid: newUserProfile.uid,
        firstName: newUserProfile.firstName,
        lastName: newUserProfile.lastName,
        email: newUserProfile.email,
        pictureUrl: newUserProfile.pictureUrl,
        timezone: newUserProfile.timezone,
        createdAt: now,
        lastActivity: now
      };
    }
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

/**
 * Sign in with Firebase custom token (from backend OAuth flow)
 * This is the NEW way for Phase 1
 */
export const signInWithCustomFirebaseToken = async (customToken: string): Promise<User> => {
  try {
    console.log('🔐 Signing in with custom token...');
    const result = await signInWithCustomToken(auth, customToken);
    console.log('✅ Custom token sign-in successful');
    return result.user;
  } catch (error) {
    console.error('❌ Error signing in with custom token:', error);
    throw error;
  }
};

/**
 * Sign out the current user
 */
export const logOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const data = userDoc.data() as UserProfileFirestore;
      return {
        uid: data.uid,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        pictureUrl: data.pictureUrl,
        timezone: data.timezone,  // NEW: Include timezone
        createdAt: new Date(data.createdAt),
        lastActivity: new Date(data.lastActivity)
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

/**
 * Update user's last activity timestamp
 */
export const updateLastActivity = async (uid: string): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      lastActivity: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating last activity:', error);
    throw error;
  }
};

/**
 * Listen to authentication state changes
 */
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Get Firebase ID token for current user (for backend authentication)
 */
export const getIdToken = async (): Promise<string | null> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn('No user is currently signed in');
      return null;
    }
    
    const idToken = await user.getIdToken();
    return idToken;
  } catch (error) {
    console.error('Error getting ID token:', error);
    throw error;
  }
};

/**
 * Get current signed-in user's UID
 */
export const getCurrentUserUid = (): string | null => {
  return auth.currentUser?.uid || null;
};