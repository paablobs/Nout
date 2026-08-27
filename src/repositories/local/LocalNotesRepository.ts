import { storageKeys } from "../../utils/storageKeys";
import {
  getLocalStorageItem,
  setLocalStorageItem,
} from "../../utils/localStorageHelper";
import type { Note, NotesRepository } from "../types";

export function createLocalNotesRepository(): NotesRepository {
  return {
    async getAll() {
      const raw = getLocalStorageItem(storageKeys.NOTES);
      if (!raw) return {};
      try {
        return JSON.parse(raw) as Record<string, Note>;
      } catch {
        return {};
      }
    },

    async upsert(note) {
      const current = await this.getAll();
      setLocalStorageItem(storageKeys.NOTES, { [note.id]: note, ...current });
    },

    async upsertBatch(notes) {
      const current = await this.getAll();
      const updated = { ...current };
      for (const note of notes) {
        updated[note.id] = note;
      }
      setLocalStorageItem(storageKeys.NOTES, updated);
    },

    async remove(noteId) {
      const current = await this.getAll();
      const { [noteId]: _, ...rest } = current;
      setLocalStorageItem(storageKeys.NOTES, rest);
    },

    async removeBatch(noteIds) {
      const current = await this.getAll();
      const updated = { ...current };
      for (const id of noteIds) {
        delete updated[id];
      }
      setLocalStorageItem(storageKeys.NOTES, updated);
    },
  };
}
