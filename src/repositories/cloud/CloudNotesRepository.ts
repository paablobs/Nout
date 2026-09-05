import {
  collection,
  doc,
  type Firestore,
  getDocs,
  setDoc,
} from "firebase/firestore";
import type { Note, NotesRepository } from "../types";
import { normalizeNote } from "../../utils/noteSchema";
import { commitInBatches, type BatchOperation } from "./firestoreBatch";

const sanitizeNoteForDoc = (note: Note): Note => {
  let createdAt = note.createdAt;
  let updatedAt = note.updatedAt;
  if (!Number.isFinite(createdAt)) createdAt = Date.now();
  if (!Number.isFinite(updatedAt)) updatedAt = createdAt;
  if (updatedAt < createdAt) updatedAt = createdAt;
  const sanitized: Note = {
    ...note,
    createdAt,
    updatedAt,
  };
  if (
    sanitized.folderId !== undefined &&
    (typeof sanitized.folderId !== "string" ||
      sanitized.folderId.length === 0 ||
      sanitized.folderId.length > 128)
  ) {
    delete (sanitized as unknown as Record<string, unknown>).folderId;
  }
  if (
    sanitized.trashedAt !== undefined &&
    typeof sanitized.trashedAt !== "number"
  ) {
    delete (sanitized as unknown as Record<string, unknown>).trashedAt;
  }
  // Strip legacy category field if present on raw object
  delete (sanitized as unknown as Record<string, unknown>).category;
  return sanitized;
};

const noteToDoc = (note: Note): Record<string, unknown> => {
  const clean = sanitizeNoteForDoc(note);
  const data: Record<string, unknown> = {
    id: clean.id,
    text: clean.text,
    isFav: clean.isFav,
    isTrash: clean.isTrash,
    isHidden: clean.isHidden,
    createdAt: clean.createdAt,
    updatedAt: clean.updatedAt,
  };
  if (clean.folderId !== undefined) {
    data.folderId = clean.folderId;
  }
  if (clean.trashedAt !== undefined) {
    data.trashedAt = clean.trashedAt;
  }
  return data;
};

export function createCloudNotesRepository(
  cloudDb: Firestore,
  userId: string,
): NotesRepository {
  const notesRef = collection(cloudDb, "users", userId, "notes");

  return {
    async getAll() {
      const snapshot = await getDocs(notesRef);
      const record: Record<string, Note> = {};
      snapshot.docs.forEach((item) => {
        record[item.id] = normalizeNote(item.data());
      });
      return record;
    },

    async upsert(note) {
      await setDoc(doc(notesRef, note.id), noteToDoc(note));
    },

    async upsertBatch(notes) {
      const operations: BatchOperation[] = notes.map(
        (note) => (batch) => batch.set(doc(notesRef, note.id), noteToDoc(note)),
      );
      await commitInBatches(cloudDb, operations);
    },

    async remove(noteId) {
      await commitInBatches(cloudDb, [
        (batch) => batch.delete(doc(notesRef, noteId)),
      ]);
    },

    async removeBatch(noteIds) {
      const operations: BatchOperation[] = noteIds.map(
        (id) => (batch) => batch.delete(doc(notesRef, id)),
      );
      await commitInBatches(cloudDb, operations);
    },
  };
}
