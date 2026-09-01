import {
  collection,
  doc,
  type Firestore,
  getDocs,
  setDoc,
} from "firebase/firestore";
import type { Folder, FoldersRepository } from "../types";
import { commitInBatches, type BatchOperation } from "./firestoreBatch";

const folderToDoc = (folder: Folder): Record<string, unknown> => {
  const data: Record<string, unknown> = {
    id: folder.id,
    name: folder.name,
  };
  if (folder.color !== undefined) {
    data.color = folder.color;
  }
  return data;
};

export function createCloudFoldersRepository(
  cloudDb: Firestore,
  userId: string,
): FoldersRepository {
  const foldersRef = collection(cloudDb, "users", userId, "folders");

  return {
    async getAll() {
      const snapshot = await getDocs(foldersRef);
      return snapshot.docs.map((item) => {
        const data = item.data() as Partial<Folder>;
        return {
          id: typeof data.id === "string" ? data.id : item.id,
          name: typeof data.name === "string" ? data.name : "",
          ...(typeof data.color === "string" ? { color: data.color } : {}),
        };
      });
    },

    async upsert(folder) {
      await setDoc(doc(foldersRef, folder.id), folderToDoc(folder));
    },

    async upsertBatch(folders) {
      const operations: BatchOperation[] = folders.map(
        (folder) => (batch) =>
          batch.set(doc(foldersRef, folder.id), folderToDoc(folder)),
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
