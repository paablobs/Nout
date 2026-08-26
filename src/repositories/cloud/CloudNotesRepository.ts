import {
  collection,
  doc,
  type Firestore,
  getDocs,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import type { Note, NotesRepository } from "../types";

const FIRESTORE_BATCH_LIMIT = 500;
type BatchOperation = (batch: ReturnType<typeof writeBatch>) => void;

export const commitInBatches = async (
  cloudDb: Firestore,
  operations: BatchOperation[],
) => {
  for (
    let index = 0;
    index < operations.length;
    index += FIRESTORE_BATCH_LIMIT
  ) {
    const batch = writeBatch(cloudDb);
    operations
      .slice(index, index + FIRESTORE_BATCH_LIMIT)
      .forEach((operation) => operation(batch));
    await batch.commit();
  }
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
        record[item.id] = item.data() as Note;
      });
      return record;
    },

    async upsert(note) {
      await setDoc(doc(notesRef, note.id), note);
    },

    async upsertBatch(notes) {
      const operations: BatchOperation[] = notes.map(
        (note) => (batch) => batch.set(doc(notesRef, note.id), note),
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
