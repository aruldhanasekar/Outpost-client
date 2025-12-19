export interface UserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  pictureUrl?: string;  // Google profile picture URL
  timezone?: string;  // NEW: User's timezone (e.g., "Asia/Kolkata")
  createdAt: Date;
  lastActivity: Date;
}

export interface UserProfileFirestore {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  pictureUrl?: string;  // Google profile picture URL
  timezone?: string;  // NEW: User's timezone
  createdAt: string; // ISO string for Firestore
  lastActivity: string; // ISO string for Firestore
}