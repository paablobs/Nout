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

export interface FirestoreFolder {
  name: string;
  color: string;
  createdAt: Timestamp;
}

export interface Scratchpad {
  text: string;
  updatedAt: Timestamp;
}
