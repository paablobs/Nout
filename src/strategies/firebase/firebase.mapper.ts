import type { Note } from "../notes.model";
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
