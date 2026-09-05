import type { Note } from "../repositories/types";

export function sanitizeNoteTimestamps(note: Note, now = Date.now()): Note {
  const createdAt =
    typeof note.createdAt === "number" && Number.isFinite(note.createdAt)
      ? note.createdAt
      : now;
  let updatedAt =
    typeof note.updatedAt === "number" && Number.isFinite(note.updatedAt)
      ? note.updatedAt
      : createdAt;
  if (updatedAt < createdAt) updatedAt = createdAt;
  if (
    note.trashedAt !== undefined &&
    typeof (note as unknown as Record<string, unknown>).trashedAt !== "number"
  ) {
    const copy = { ...note } as Note & Record<string, unknown>;
    delete copy.trashedAt;
    return { ...copy, createdAt, updatedAt };
  }
  return { ...note, createdAt, updatedAt };
}

export function normalizeNote(raw: unknown): Note {
  const candidate = (raw ?? {}) as Partial<Note> & Record<string, unknown>;
  const rawCreatedAt =
    typeof candidate.createdAt === "number" &&
    Number.isFinite(candidate.createdAt)
      ? candidate.createdAt
      : 0;
  const rawUpdatedAt =
    typeof candidate.updatedAt === "number" &&
    Number.isFinite(candidate.updatedAt)
      ? candidate.updatedAt
      : 0;
  const createdAt = rawCreatedAt;
  const updatedAt = rawUpdatedAt < rawCreatedAt ? rawCreatedAt : rawUpdatedAt;
  const note: Note = {
    id: typeof candidate.id === "string" ? candidate.id : "",
    text: typeof candidate.text === "string" ? candidate.text : "",
    isFav: candidate.isFav === true,
    isTrash: candidate.isTrash === true,
    isHidden: candidate.isHidden === true,
    createdAt,
    updatedAt,
  };
  if (
    typeof candidate.folderId === "string" &&
    candidate.folderId.length > 0 &&
    candidate.folderId.length <= 128
  ) {
    note.folderId = candidate.folderId;
  }
  if (
    typeof candidate.trashedAt === "number" &&
    Number.isFinite(candidate.trashedAt)
  ) {
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
