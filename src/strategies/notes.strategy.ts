import type { Note } from "./notes.model";

export interface NotesStrategy {
  addNote: (note: Note) => Promise<void>;
  addFolder: () => Promise<void>;
  deleteFolder: () => Promise<void>;
  addFavorite: () => Promise<void>;
  moveNoteToFolder: () => Promise<void>;
  deleteNotes: () => Promise<void>;
  restoreNote: () => Promise<void>;
  getNoteById: () => Promise<void>;
  updateNoteText: () => Promise<void>;
  hideNote: () => Promise<void>;
}
