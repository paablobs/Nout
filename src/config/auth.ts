import {
  browserLocalPersistence,
  GoogleAuthProvider,
  getAuth,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  type Auth,
  type UserCredential,
} from "firebase/auth";
import { app, firebaseEnabled } from "./firebase";

export const auth: Auth | null = app ? getAuth(app) : null;

if (auth && firebaseEnabled) {
  void setPersistence(auth, browserLocalPersistence);
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

const REDIRECT_FALLBACK_CODES = new Set([
  "auth/popup-blocked",
  "auth/operation-not-supported-in-this-environment",
  "auth/cancelled-popup-request",
]);

const shouldFallBackToRedirect = (error: unknown): boolean => {
  const code = (error as { code?: string } | null)?.code;
  return typeof code === "string" && REDIRECT_FALLBACK_CODES.has(code);
};

export const signInWithGoogle = async (): Promise<UserCredential | null> => {
  if (!auth) return null;
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error) {
    if (shouldFallBackToRedirect(error)) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw error;
  }
};
