import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
  type Auth,
  type Unsubscribe,
} from 'firebase/auth';

/**
 * Firebase Configuration for Le Socle (Stage 2A: Authentication)
 * Reads from Vite environment variables (VITE_FIREBASE_*).
 * Fallback values for project ID and auth domain are taken from the user's registered project.
 */
function getEnvVar(key: string): string {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return String(import.meta.env[key]);
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return String(process.env[key]);
  }
  return '';
}

export interface FirebaseConfigStatus {
  isConfigured: boolean;
  missingKeys: string[];
  projectId: string;
  authDomain: string;
}

export function getFirebaseConfigStatus(): FirebaseConfigStatus {
  const apiKey = getEnvVar('VITE_FIREBASE_API_KEY');
  const appId = getEnvVar('VITE_FIREBASE_APP_ID');
  const authDomain = getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || 'le-socle.firebaseapp.com';
  const projectId = getEnvVar('VITE_FIREBASE_PROJECT_ID') || 'le-socle';

  const missing: string[] = [];
  if (!apiKey) missing.push('VITE_FIREBASE_API_KEY');
  if (!appId) missing.push('VITE_FIREBASE_APP_ID');

  return {
    isConfigured: missing.length === 0,
    missingKeys: missing,
    projectId,
    authDomain,
  };
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function getFirebaseAuth(): Auth | null {
  if (auth) return auth;
  const status = getFirebaseConfigStatus();
  if (!status.isConfigured) return null;

  try {
    const apiKey = getEnvVar('VITE_FIREBASE_API_KEY');
    const authDomain = getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || 'le-socle.firebaseapp.com';
    const projectId = getEnvVar('VITE_FIREBASE_PROJECT_ID') || 'le-socle';
    const storageBucket = getEnvVar('VITE_FIREBASE_STORAGE_BUCKET') || 'le-socle.firebasestorage.app';
    const messagingSenderId = getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID');
    const appId = getEnvVar('VITE_FIREBASE_APP_ID');

    app = getApps().length > 0 ? getApp() : initializeApp({
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
    });
    auth = getAuth(app);
    return auth;
  } catch (err) {
    console.error('Failed to initialize Firebase App:', err);
    return null;
  }
}

// Initial attempt
getFirebaseAuth();

/**
 * Subscribes to Firebase auth state changes.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToAuthState(callback: (user: User | null) => void): Unsubscribe {
  const currentAuth = getFirebaseAuth();
  if (!currentAuth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(currentAuth, callback);
}

/**
 * Register a new user with email and password.
 */
export async function registerWithEmail(email: string, pass: string): Promise<User> {
  const currentAuth = getFirebaseAuth();
  if (!currentAuth) {
    const missing = getFirebaseConfigStatus().missingKeys.join(', ');
    throw new Error(`Firebase is not configured. Missing environment variables: ${missing}`);
  }
  const cred = await createUserWithEmailAndPassword(currentAuth, email.trim(), pass);
  return cred.user;
}

/**
 * Sign in existing user with email and password.
 */
export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const currentAuth = getFirebaseAuth();
  if (!currentAuth) {
    const missing = getFirebaseConfigStatus().missingKeys.join(', ');
    throw new Error(`Firebase is not configured. Missing environment variables: ${missing}`);
  }
  const cred = await signInWithEmailAndPassword(currentAuth, email.trim(), pass);
  return cred.user;
}

/**
 * Sign in user with Google popup.
 */
export async function loginWithGoogle(): Promise<User> {
  const currentAuth = getFirebaseAuth();
  if (!currentAuth) {
    const missing = getFirebaseConfigStatus().missingKeys.join(', ');
    throw new Error(`Firebase is not configured. Missing environment variables: ${missing}`);
  }
  const cred = await signInWithPopup(currentAuth, googleProvider);
  return cred.user;
}

/**
 * Sign out currently logged-in user.
 */
export async function logoutUser(): Promise<void> {
  const currentAuth = getFirebaseAuth();
  if (!currentAuth) return;
  await signOut(currentAuth);
}

/**
 * Translates Firebase error codes into actionable, user-friendly error messages.
 */
export function getFirebaseErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'An unexpected error occurred during authentication.';
  }
  const code = (error as { code?: string }).code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email address is already registered. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled in the Firebase Console.';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose at least 6 characters.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please verify your credentials.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was canceled before completion.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site and try again.';
    case 'auth/cancelled-popup-request':
      return 'Sign-in request was cancelled.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please verify your internet connection.';
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Access is temporarily disabled. Please try again later.';
    default: {
      const msg = (error as { message?: string }).message;
      return msg ? msg.replace(/^Firebase:\s*/, '') : 'Authentication failed. Please try again.';
    }
  }
}
