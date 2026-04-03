import { auth } from "../config/firebase";
import { v4 as uuidv4 } from "uuid";
import type { Note } from "../strategies/notes.model";
import useFirestoreNotesStrategy from "../strategies/firebase/useFirestoreNotesStrategy";
import useLocalStorageNotesStrategy from "../strategies/local/useLocalStorageNotesStrategy";
import { selectedView } from "../utils/selectedView";

const createNote = (currentView: string, selectedFolderId?: string): Note => {
  const now = new Date();

  return {
    id: uuidv4(),
    text: "",
    folderId: selectedFolderId ?? null,
    isFav: currentView === selectedView.FAVORITES,
    isTrash: false,
    isHidden: false,
    createdAt: now,
    updatedAt: now,
  };
};

export const useNotes = () => {
  const user = auth?.currentUser?.uid;
  const localStrategy = useLocalStorageNotesStrategy();
  const firebaseStrategy = useFirestoreNotesStrategy(user ?? "");

  const strategy = user ? firebaseStrategy : localStrategy;

  const addNote = async (currentView: string, selectedFolderId?: string) => {
    const note = createNote(currentView, selectedFolderId);
    await strategy.addNote(note);
    return note.id;
  };

  return { addNote };
};
