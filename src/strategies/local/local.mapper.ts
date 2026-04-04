import { getLocalStorageItem } from "../../utils/localStorageHelper";
import { storageKeys } from "../../utils/storageKeys";
import type { Note } from "../note.model";

export interface LocalStorageNote {
  id: string;
  text: string;
  category: string;
  isFav: boolean;
  isTrash: boolean;
  isHidden: boolean;
  folderId?: string;
}

type Folder = {
  id: string;
  name: string;
};

const DEFAULT_CATEGORY = "All notes";

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

const mapCategoryToFolderId = (category: string): string | null => {
  if (category === DEFAULT_CATEGORY) return null;

  const folders = getFoldersFromStorage();
  const folder = folders.find((f) => f.name === category);

  return folder ? folder.id : null;
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

export const fromLocal = (local: LocalStorageNote): Note => ({
  id: local.id,
  text: local.text,
  folderId: local.folderId ?? mapCategoryToFolderId(local.category),
  isFav: local.isFav,
  isTrash: local.isTrash,
  isHidden: local.isHidden,
  createdAt: new Date(),
  updatedAt: new Date(),
});
