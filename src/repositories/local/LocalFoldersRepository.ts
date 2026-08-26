import { storageKeys } from "../../utils/storageKeys";
import {
  getLocalStorageItem,
  setLocalStorageItem,
} from "../../utils/localStorageHelper";
import type { Folder, FoldersRepository } from "../types";

export function createLocalFoldersRepository(): FoldersRepository {
  return {
    async getAll() {
      const raw = getLocalStorageItem(storageKeys.FOLDERS);
      if (!raw) return [];
      try {
        return JSON.parse(raw) as Folder[];
      } catch {
        return [];
      }
    },

    async upsert(folder) {
      const current = await this.getAll();
      setLocalStorageItem(storageKeys.FOLDERS, [folder, ...current]);
    },

    async upsertBatch(folders) {
      const current = await this.getAll();
      setLocalStorageItem(storageKeys.FOLDERS, [...folders, ...current]);
    },

    async remove(folderId) {
      const current = await this.getAll();
      setLocalStorageItem(
        storageKeys.FOLDERS,
        current.filter((f) => f.id !== folderId),
      );
    },
  };
}
