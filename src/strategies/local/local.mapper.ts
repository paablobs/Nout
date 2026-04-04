import { getLocalStorageItem } from "../../utils/localStorageHelper";
import { storageKeys } from "../../utils/storageKeys";
import type { Note } from "../notes.model";

export interface LocalStorageNote {
  id: string;
  text: string;
  category: string;
  isFav: boolean;
  isTrash: boolean;
  isHidden: boolean;
  folderId?: string;
}

const DEFAULT_CATEGORY = "All notes";

type Folder = {
  id: string;
  name: string;
};

const getFoldersFromStorage = (): Folder[] => {
  const raw = getLocalStorageItem(storageKeys.FOLDERS);
  return raw ? JSON.parse(raw) : [];
};

const mapFolderToCategory = (folderId: string | null): string => {
  if (!folderId) return DEFAULT_CATEGORY;

  const folders = getFoldersFromStorage();
  const folder = folders.find((f) => f.id === folderId);

  return folder ? folder.name : DEFAULT_CATEGORY;
};

export const toLocal = (note: Note): LocalStorageNote => ({
  id: note.id,
  text: note.text,
  category: mapFolderToCategory(note.folderId),
  isFav: note.isFav,
  isTrash: note.isTrash,
  isHidden: note.isHidden,
  folderId: note.folderId ?? undefined,
});
