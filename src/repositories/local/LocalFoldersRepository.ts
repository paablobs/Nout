import { storageKeys } from "../../utils/storageKeys";
import {
  getLocalStorageItem,
  setLocalStorageItem,
} from "../../utils/localStorageHelper";
import type { Folder, FoldersRepository } from "../types";

const isFolder = (value: unknown): value is Folder =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Folder).id === "string" &&
  typeof (value as Folder).name === "string";

export function createLocalFoldersRepository(): FoldersRepository {
  const readAll = async (): Promise<Folder[]> => {
    const raw = getLocalStorageItem(storageKeys.FOLDERS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown[];
      return parsed.filter(isFolder);
    } catch {
      return [];
    }
  };

  return {
    async getAll() {
      return readAll();
    },

    async upsert(folder) {
      const current = await readAll();
      setLocalStorageItem(storageKeys.FOLDERS, [
        folder,
        ...current.filter((item) => item.id !== folder.id),
      ]);
    },

    async upsertBatch(folders) {
      if (folders.length === 0) return;
      const current = await readAll();
      const writtenIds = new Set(folders.map((folder) => folder.id));
      setLocalStorageItem(storageKeys.FOLDERS, [
        ...folders,
        ...current.filter((item) => !writtenIds.has(item.id)),
      ]);
    },

    async remove(folderId) {
      const current = await readAll();
      setLocalStorageItem(
        storageKeys.FOLDERS,
        current.filter((folder) => folder.id !== folderId),
      );
    },
  };
}
