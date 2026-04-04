import { addDoc, collection, getDocs, Timestamp } from "firebase/firestore";
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

  const addNote = async (note: Note) => {
    if (!userId) {
      throw new Error("User ID is required to add a note to Firestore.");
    }

    await addDoc(collection(db, "users", userId, "notes"), toFirestore(note));
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
  };
};

export default useFirestoreNotesStrategy;
