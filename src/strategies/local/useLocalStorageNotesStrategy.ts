import { storageKeys } from "../../utils/storageKeys";
import { fromLocal, toLocal, type LocalStorageNote } from "./local.mapper";
import type { Note } from "../note.model";
import {
  getLocalStorageItem,
  setLocalStorageItem,
} from "../../utils/localStorageHelper";

export interface Folder {
  id: string;
  name: string;
  color?: string;
}

export const DEFAULT_CATEGORY = "All notes";

const useLocalStorageNotesStrategy = () => {
  const getNotes = async (): Promise<Note[]> => {
    const stored = getLocalStorageItem(storageKeys.NOTES);
    const parsedStored = stored ? JSON.parse(stored) : {};

    if (!parsedStored) return [];

    return Object.values(parsedStored as Record<string, LocalStorageNote>).map(
      fromLocal,
    );
  };

  const getFolders = async (): Promise<Folder[]> => {
    return getLocalStorageItem(storageKeys.FOLDERS)
      ? JSON.parse(getLocalStorageItem(storageKeys.FOLDERS) as string)
      : [];
  };

  const addNote = async (note: Note) => {
    const stored = getLocalStorageItem(storageKeys.NOTES);
    const parsedStored = stored ? JSON.parse(stored) : {};
    const localNote = toLocal(note);

    setLocalStorageItem(storageKeys.NOTES, {
      [localNote.id]: localNote,
      ...parsedStored,
    });
  };

  const addFolder = async (folder: Folder) => {
    const stored: Folder[] = getLocalStorageItem(storageKeys.FOLDERS)
      ? JSON.parse(getLocalStorageItem(storageKeys.FOLDERS) as string)
      : [];

    setLocalStorageItem(storageKeys.FOLDERS, [folder, ...stored]);
  };

  return {
    getNotes,
    getFolders,
    addNote,
    addFolder,
  };
};

export default useLocalStorageNotesStrategy;
