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

const noteToDoc = (note: Note): Record<string, unknown> => {
  const data: Record<string, unknown> = {
    id: note.id,
    text: note.text,
    isFav: note.isFav,
    isTrash: note.isTrash,
    isHidden: note.isHidden,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
  if (note.folderId !== undefined) {
    data.folderId = note.folderId;
  }
  if (note.trashedAt !== undefined) {
    data.trashedAt = note.trashedAt;
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
