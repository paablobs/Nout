import type { Note } from "../repositories/types";
import { stripHtml } from "./notePreview";

export function searchNotes(notes: Note[], query: string): Note[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return notes;
  return notes.filter((note) =>
    stripHtml(note.text).toLowerCase().includes(needle),
  );
}

export function compareByUpdatedAtDesc(a: Note, b: Note): number {
  return b.updatedAt - a.updatedAt || b.createdAt - a.createdAt;
}

export function sortByUpdatedAtDesc(notes: Note[]): Note[] {
  return [...notes].sort(compareByUpdatedAtDesc);
}

export function sortByTrashedAtDesc(notes: Note[]): Note[] {
  return [...notes].sort(
    (a, b) =>
      (b.trashedAt ?? 0) - (a.trashedAt ?? 0) || compareByUpdatedAtDesc(a, b),
  );
}
