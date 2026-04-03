import type { Note } from "../notes.model";

export interface LocalStorageNote {
  id: string;
  text: string;
  category: string;
  isFav: boolean;
  isTrash: boolean;
  isHidden: boolean;
  folderId?: string;
}

// const mapFolderToCategory = (folderId: string | null): string => {
//   if (!folderId) return "notes";
//   return "folder"; // adapt to your real rule
// };

export const toLocal = (note: Note): LocalStorageNote => ({
  id: note.id,
  text: note.text,
  // category: mapFolderToCategory(note.folderId),
  category: "All notes",
  isFav: note.isFav,
  isTrash: note.isTrash,
  isHidden: note.isHidden,
  folderId: note.folderId ?? undefined,
});
