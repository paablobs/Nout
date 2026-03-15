import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBRaeXTYA3ULuIsns6Zzhwly78-nQ1aZjs",
  authDomain: "nout-103f0.firebaseapp.com",
  projectId: "nout-103f0",
  storageBucket: "nout-103f0.firebasestorage.app",
  messagingSenderId: "518554411474",
  appId: "1:518554411474:web:c5228f8c835bc3eab5a80b",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
