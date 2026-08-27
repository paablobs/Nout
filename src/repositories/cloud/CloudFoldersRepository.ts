import {
  collection,
  doc,
  type Firestore,
  getDocs,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import type { Folder, FoldersRepository } from "../types";

const FIRESTORE_BATCH_LIMIT = 500;
type BatchOperation = (batch: ReturnType<typeof writeBatch>) => void;

const commitInBatches = async (
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

export function createCloudFoldersRepository(
  cloudDb: Firestore,
  userId: string,
): FoldersRepository {
  const foldersRef = collection(cloudDb, "users", userId, "folders");

  return {
    async getAll() {
      const snapshot = await getDocs(foldersRef);
      return snapshot.docs.map((item) => item.data() as Folder);
    },

    async upsert(folder) {
      await setDoc(doc(foldersRef, folder.id), folder);
    },

    async upsertBatch(folders) {
      const operations: BatchOperation[] = folders.map(
        (folder) => (batch) => batch.set(doc(foldersRef, folder.id), folder),
      );
      await commitInBatches(cloudDb, operations);
    },

    async remove(folderId) {
      await commitInBatches(cloudDb, [
        (batch) => batch.delete(doc(foldersRef, folderId)),
      ]);
    },
  };
}
