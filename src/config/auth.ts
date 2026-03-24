import type { User, Unsubscribe } from "firebase/auth";
import {
  browserSessionPersistence,
  setPersistence,
  signInWithPopup,
  signOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

// Sign in with Google functionality
export const signInWithGoogle = async () => {
  try {
    return setPersistence(auth, browserSessionPersistence).then(async () => {
      const result = await signInWithPopup(auth, googleProvider);
      return {
        success: true,
        user: result.user,
        error: null,
      };
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      user: null,
      error: errorMessage,
    };
  }
};

// Sign out functionality
export const firebaseSignOut = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: errorMessage,
    };
  }
};

// Auth state observer
export const onAuthStateChanged = (
  callback: (user: User | null) => void,
): Unsubscribe => {
  return firebaseOnAuthStateChanged(auth, callback);
};
