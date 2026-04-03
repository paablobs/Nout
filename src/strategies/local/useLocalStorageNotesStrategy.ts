import { storageKeys } from "../../utils/storageKeys";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { toLocal } from "./local.mapper";
import type { Note } from "../notes.model";
import { getLocalStorageItem } from "../../utils/localStorageHelper";

export interface Folder {
  id: string;
  name: string;
  color?: string;
}

export const DEFAULT_CATEGORY = "All notes";

const useLocalStorageNotesStrategy = () => {
  const [notes, setNotes] = useLocalStorage<Record<string, Note>>(
    storageKeys.NOTES,
    {},
  );

  const addNote = async (note: Note) => {
    // const stored = JSON.parse(localStorage.getItem("notes") ?? "{}");
    const stored = getLocalStorageItem(storageKeys.NOTES);
    const parsedStored = stored ? JSON.parse(stored) : {};
    const localNote = toLocal(note);

    setNotes({ [localNote.id]: localNote, ...parsedStored });
  };

  return {
    notes,
    addNote,
  };
};

export default useLocalStorageNotesStrategy;
