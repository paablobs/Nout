import type { Note } from "../repositories/types";

export function normalizeNote(raw: unknown): Note {
  const candidate = (raw ?? {}) as Partial<Note> & Record<string, unknown>;
  const note: Note = {
    id: typeof candidate.id === "string" ? candidate.id : "",
    text: typeof candidate.text === "string" ? candidate.text : "",
    isFav: candidate.isFav === true,
    isTrash: candidate.isTrash === true,
    isHidden: candidate.isHidden === true,
    createdAt:
      typeof candidate.createdAt === "number" ? candidate.createdAt : 0,
    updatedAt:
      typeof candidate.updatedAt === "number" ? candidate.updatedAt : 0,
  };
  if (typeof candidate.folderId === "string") {
    note.folderId = candidate.folderId;
  }
  if (typeof candidate.trashedAt === "number") {
    note.trashedAt = candidate.trashedAt;
  }
  return note;
}

export function backfillTrashedAt(
  notes: Record<string, Note>,
  now: number,
): Record<string, Note> {
  let changed = false;
  const result: Record<string, Note> = {};
  for (const [id, note] of Object.entries(notes)) {
    if (note.isTrash && note.trashedAt === undefined) {
      result[id] = { ...note, trashedAt: now };
      changed = true;
    } else {
      result[id] = note;
    }
  }
  return changed ? result : notes;
}
