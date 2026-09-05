import { storageKeys } from "../../utils/storageKeys";
import {
  getLocalStorageItem,
  setLocalStorageItem,
} from "../../utils/localStorageHelper";
import type { Note, NotesRepository } from "../types";
import { normalizeNote } from "../../utils/noteSchema";

export function createLocalNotesRepository(): NotesRepository {
  const readAll = async (): Promise<Record<string, Note>> => {
    const raw = getLocalStorageItem(storageKeys.NOTES);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const record: Record<string, Note> = {};
      for (const [id, value] of Object.entries(parsed)) {
        const note = normalizeNote(value);
        if (note.id) {
          record[id] = note;
        }
      }
      return record;
    } catch {
      return {};
    }
  };

  return {
    async getAll() {
      return readAll();
    },

    async upsert(note) {
      const current = await readAll();
      setLocalStorageItem(storageKeys.NOTES, { ...current, [note.id]: note });
    },

    async upsertBatch(notes) {
      if (notes.length === 0) return;
      const current = await readAll();
      const updated = { ...current };
      for (const note of notes) {
        updated[note.id] = note;
      }
      setLocalStorageItem(storageKeys.NOTES, updated);
    },

    async remove(noteId) {
      const current = await readAll();
      const { [noteId]: _removed, ...rest } = current;
      setLocalStorageItem(storageKeys.NOTES, rest);
    },

    async removeBatch(noteIds) {
      if (noteIds.length === 0) return;
      const current = await readAll();
      const updated = { ...current };
      for (const id of noteIds) {
        delete updated[id];
      }
      setLocalStorageItem(storageKeys.NOTES, updated);
    },
  };
}
