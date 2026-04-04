import type { Note } from "../note.model";
import { Timestamp } from "firebase/firestore";

export interface FirestoreNote {
  text: string;
  folderId: string | null;
  isFav: boolean;
  isTrash: boolean;
  isHidden: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const toFirestore = (note: Note): FirestoreNote => ({
  text: note.text,
  folderId: note.folderId,
  isFav: note.isFav,
  isTrash: note.isTrash,
  isHidden: note.isHidden,
  createdAt: Timestamp.fromDate(note.createdAt),
  updatedAt: Timestamp.fromDate(note.updatedAt),
});

export const fromFirestore = (id: string, data: FirestoreNote): Note => ({
  id,
  text: data.text,
  folderId: data.folderId,
  isFav: data.isFav,
  isTrash: data.isTrash,
  isHidden: data.isHidden,
  createdAt: data.createdAt.toDate(),
  updatedAt: data.updatedAt.toDate(),
});
