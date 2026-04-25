import {
  browserLocalPersistence,
  GoogleAuthProvider,
  getAuth,
  setPersistence,
  signInWithPopup,
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

export const signInWithGoogle = async (): Promise<UserCredential | null> => {
  if (!auth) return null;
  return signInWithPopup(auth, googleProvider);
};
