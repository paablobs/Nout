import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBRaeXTYA3ULuIsns6Zzhwly78-nQ1aZjs",
  authDomain: "nout-103f0.firebaseapp.com",
  projectId: "nout-103f0",
  storageBucket: "nout-103f0.firebasestorage.app",
  messagingSenderId: "518554411474",
  appId: "1:518554411474:web:c5228f8c835bc3eab5a80b",
};

export const firebaseEnabled = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.appId,
].every((value) => Boolean(value));

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

if (firebaseEnabled) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    db = getFirestore(app);
  }
}

export { app, db };
