import type { Folder, Note } from "../repositories/types";
import { backfillTrashedAt } from "./noteSchema";

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
    if (!cloud || note.updatedAt > cloud.updatedAt) {
      notesToWrite.push(note);
    }
  }

  for (const cloudNote of Object.values(input.cloudNotes)) {
    if (cloudNote.isTrash && cloudNote.trashedAt === undefined) {
      notesToWrite.push({ ...cloudNote, trashedAt: input.now });
    }
  }

  return { notesToWrite, foldersToWrite };
}
