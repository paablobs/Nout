import {
  addDoc,
  collection,
  getDocs,
  Timestamp,
  setDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import type { Note } from "../note.model";
import { fromFirestore, toFirestore } from "./firebase.mapper";
import type { Folder } from "../folder.model";

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
  const getNotes = async (): Promise<Note[]> => {
    if (!userId) {
      throw new Error("User ID is required to fetch notes from Firestore.");
    }

    const notesRef = collection(db, "users", userId, "notes");
    const snap = await getDocs(notesRef);

    return snap.docs.map((d) => fromFirestore(d.id, d.data() as FirestoreNote));
  };

  const getFolders = async (): Promise<Folder[]> => {
    if (!userId) {
      throw new Error("User ID is required to fetch folders from Firestore.");
    }
    const foldersRef = collection(db, "users", userId, "folders");
    const snap = await getDocs(foldersRef);

    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Folder, "id">),
    }));
  };

  // Persist a note using the client-provided note.id as the document ID so
  // subsequent updates can reference the same document.
  const addNote = async (note: Note) => {
    if (!userId) {
      throw new Error("User ID is required to add a note to Firestore.");
    }

    const noteDoc = doc(db, "users", userId, "notes", note.id);
    await setDoc(noteDoc, toFirestore(note));
  };

  // Update an existing note document in Firestore. Uses setDoc with merge to
  // safely update fields (timestamps are handled by the mapper).
  const updateNote = async (note: Note) => {
    if (!userId) {
      throw new Error("User ID is required to update notes in Firestore.");
    }

    const noteDoc = doc(db, "users", userId, "notes", note.id);
    await setDoc(noteDoc, toFirestore(note), { merge: true });
  };

  const addFolder = async (folder: Folder) => {
    if (!userId) {
      throw new Error("User ID is required to add a folder to Firestore.");
    }

    await addDoc(collection(db, "users", userId, "folders"), folder);
  };

  return {
    getNotes,
    getFolders,
    addNote,
    addFolder,
    updateNote,
  };
};

export default useFirestoreNotesStrategy;
