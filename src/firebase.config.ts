// Firebase configuration will be added here
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCF0-_4eVcpLzlniz3QkuUAt9kVxmnqgGg",
  authDomain: "outpostmail.firebaseapp.com",
  projectId: "outpostmail",
  storageBucket: "outpostmail.firebasestorage.app",
  messagingSenderId: "709765843998",
  appId: "1:709765843998:web:5111b2ee0139dea347f20f",
  measurementId: "G-DWLPDTV1WR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics
const analytics = getAnalytics(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Export analytics for use in components if needed
export { analytics };
