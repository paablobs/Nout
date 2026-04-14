import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  signInAnonymously,
  type Auth,
  type UserCredential,
} from "firebase/auth";
import { app, firebaseEnabled } from "./firebase";

export const auth: Auth | null = app ? getAuth(app) : null;

if (auth && firebaseEnabled) {
  void setPersistence(auth, browserLocalPersistence);
}

export const signInToCloud = async (): Promise<UserCredential | null> => {
  if (!auth) return null;
  return signInAnonymously(auth);
};
