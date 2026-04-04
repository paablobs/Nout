import type { Note } from "./note.model";

export interface NotesStrategy {
  notes: Promise<Note[]>;
  addNote: (note: Note) => Promise<void>;
}
