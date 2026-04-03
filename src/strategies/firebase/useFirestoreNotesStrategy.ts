import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import type { Note } from "../notes.model";
import { toFirestore } from "./firebase.mapper";

export interface FirestoreNote {
  text: string;
  folderId: string | null;
  isFav: boolean;
  isTrash: boolean;
  isHidden: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreFolder {
  name: string;
  color: string;
  createdAt: Timestamp;
}

export interface Scratchpad {
  text: string;
  updatedAt: Timestamp;
}

const useFirestoreNotesStrategy = (userId: string | undefined) => {
  const getAllNotes = async (): Promise<Record<string, FirestoreNote>> => {
    if (!userId) {
      throw new Error("User ID is required to fetch notes from Firestore.");
    }
    const notesRef = collection(db, "users", userId, "notes");
    const snap = await getDocs(notesRef);

    console.log(
      "Fetched notes from Firestore:",
      snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    );

    return Object.fromEntries(
      snap.docs.map((doc) => [doc.id, doc.data() as FirestoreNote]),
    );
  };

  const getAllFolders = async (): Promise<Record<string, FirestoreFolder>> => {
    if (!userId) {
      throw new Error("User ID is required to fetch folders from Firestore.");
    }
    const foldersRef = collection(db, "users", userId, "folders");
    const snap = await getDocs(foldersRef);

    return Object.fromEntries(
      snap.docs.map((doc) => [doc.id, doc.data() as FirestoreFolder]),
    );
  };

  const getScratchpad = async (): Promise<Scratchpad | null> => {
    if (!userId) {
      throw new Error(
        "User ID is required to fetch scratchpad from Firestore.",
      );
    }
    const scratchpadRef = doc(db, "users", userId, "meta", "scratchpad");
    const snap = await getDoc(scratchpadRef);

    return snap.exists() ? (snap.data() as Scratchpad) : null;
  };

  const addNote = async (note: Note) => {
    if (!userId) {
      throw new Error("User ID is required to add a note to Firestore.");
    }
    await addDoc(collection(db, "users", userId, "notes"), toFirestore(note));
  };

  return {
    getAllNotes,
    getAllFolders,
    getScratchpad,
    addNote,
  };
};

export default useFirestoreNotesStrategy;
