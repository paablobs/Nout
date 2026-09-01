import type { Note } from "../repositories/types";

export const TRASH_RETENTION_DAYS = 30;
export const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function selectPurgeIds(
  notes: Record<string, Note>,
  now: number,
): string[] {
  return Object.values(notes)
    .filter(
      (note) =>
        note.isTrash &&
        note.trashedAt !== undefined &&
        note.trashedAt > 0 &&
        now - note.trashedAt >= TRASH_RETENTION_MS,
    )
    .map((note) => note.id);
}
