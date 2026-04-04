import { auth } from "../config/firebase";
import { v4 as uuidv4 } from "uuid";
import type { Note } from "../strategies/note.model";
import type { Folder } from "../strategies/folder.model";
import useFirestoreNotesStrategy from "../strategies/firebase/useFirestoreNotesStrategy";
import useLocalStorageNotesStrategy from "../strategies/local/useLocalStorageNotesStrategy";
import { selectedView } from "../utils/selectedView";
import randomColor from "../utils/randomColor";

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

const createFolder = (folderName: string): Folder => ({
  id: uuidv4(),
  name: folderName.trim(),
  color: randomColor(),
});

export const useNotes = () => {
  const user = auth?.currentUser?.uid;
  const localStrategy = useLocalStorageNotesStrategy();
  const firebaseStrategy = useFirestoreNotesStrategy(user ?? "");

  const strategy = user ? firebaseStrategy : localStrategy;

  const getNotes = () => {
    return strategy.getNotes();
  };

  const getFolders = () => {
    return strategy.getFolders();
  };

  const addNote = async (currentView: string, selectedFolderId?: string) => {
    const note = createNote(currentView, selectedFolderId);
    await strategy.addNote(note);
    return note.id;
  };

  const addFolder = async (folderName: string) => {
    if (!folderName.trim()) return;

    const folder = createFolder(folderName);
    await strategy.addFolder(folder);
  };

  return { getNotes, getFolders, addNote, addFolder };
};
