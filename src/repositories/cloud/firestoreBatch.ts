import { writeBatch, type Firestore } from "firebase/firestore";

export const FIRESTORE_BATCH_LIMIT = 500;

export type BatchOperation = (batch: ReturnType<typeof writeBatch>) => void;

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

export const commitAtomically = async (
  cloudDb: Firestore,
  operations: BatchOperation[],
) => {
  if (operations.length > FIRESTORE_BATCH_LIMIT) {
    throw new Error(
      "Firestore atomic batch cannot contain more than 500 writes",
    );
  }
  const batch = writeBatch(cloudDb);
  operations.forEach((operation) => operation(batch));
  await batch.commit();
};
