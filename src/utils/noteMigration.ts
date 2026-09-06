import type { Folder, Note } from "../repositories/types";
import { backfillTrashedAt, sanitizeNoteTimestamps } from "./noteSchema";

export interface MigrationPlan {
  notesToWrite: Note[];
  foldersToWrite: Folder[];
}

export interface MigrationInput {
  localNotes: Record<string, Note>;
  localFolders: Folder[];
  cloudNotes: Record<string, Note>;
  cloudFolders: Folder[];
  now: number;
}

export function planMigration(input: MigrationInput): MigrationPlan {
  const notesToWrite: Note[] = [];
  const foldersToWrite: Folder[] = [];

  for (const folder of input.localFolders) {
    if (!input.cloudFolders.some((cloud) => cloud.id === folder.id)) {
      foldersToWrite.push(folder);
    }
  }

  const localNotes = backfillTrashedAt(input.localNotes, input.now);
  for (const note of Object.values(localNotes)) {
    const cloud = input.cloudNotes[note.id];
    const sanitized = sanitizeNoteTimestamps(note, input.now);
    if (!cloud || sanitized.updatedAt > cloud.updatedAt) {
      notesToWrite.push(sanitized);
    }
  }

  for (const cloudNote of Object.values(input.cloudNotes)) {
    if (cloudNote.isTrash && cloudNote.trashedAt === undefined) {
      notesToWrite.push(
        sanitizeNoteTimestamps(
          { ...cloudNote, trashedAt: input.now },
          input.now,
        ),
      );
    }
  }

  return { notesToWrite, foldersToWrite };
}
