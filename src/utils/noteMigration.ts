import type { Folder, Note } from "../repositories/types";
import {
  fingerprintFolder,
  fingerprintNote,
  type MigrationLedger,
} from "./localMigrationLedger";
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
  migrationLedger?: MigrationLedger;
}

export function excludeNoteIds(
  notes: Note[],
  excludedIds: ReadonlySet<string>,
): Note[] {
  return notes.filter((note) => !excludedIds.has(note.id));
}

export function planMigration(input: MigrationInput): MigrationPlan {
  const notesToWrite = new Map<string, Note>();
  const foldersToWrite: Folder[] = [];
  const ledger = input.migrationLedger;

  for (const folder of input.localFolders) {
    const cloud = input.cloudFolders.find((item) => item.id === folder.id);
    const fingerprint = fingerprintFolder(folder);
    const unchangedSinceMigration =
      ledger?.folders[folder.id] !== undefined &&
      ledger.folders[folder.id] === fingerprint;
    const changedSinceMigration =
      ledger?.folders[folder.id] !== undefined && !unchangedSinceMigration;
    if (
      (!cloud && !unchangedSinceMigration) ||
      (cloud && changedSinceMigration)
    ) {
      foldersToWrite.push(folder);
    }
  }

  const localNotes = backfillTrashedAt(input.localNotes, input.now);
  for (const note of Object.values(localNotes)) {
    const originalNote = input.localNotes[note.id] ?? note;
    const cloud = input.cloudNotes[note.id];
    const sanitized = sanitizeNoteTimestamps(note, input.now);
    const unchangedSinceMigration =
      ledger?.notes[note.id] !== undefined &&
      ledger.notes[note.id] === fingerprintNote(originalNote);
    const changedSinceMigration =
      ledger?.notes[note.id] !== undefined && !unchangedSinceMigration;
    const newerThanCloud = cloud && sanitized.updatedAt > cloud.updatedAt;
    const changedOnTimestampTie =
      cloud && sanitized.updatedAt === cloud.updatedAt && changedSinceMigration;
    if (
      (!cloud && !unchangedSinceMigration) ||
      (cloud && (newerThanCloud || changedOnTimestampTie))
    ) {
      notesToWrite.set(sanitized.id, sanitized);
    }
  }

  for (const cloudNote of Object.values(input.cloudNotes)) {
    if (cloudNote.isTrash && cloudNote.trashedAt === undefined) {
      // A newer local note with this id already won the migration plan. Keep
      // that choice instead of adding a second write that could overwrite it.
      if (!notesToWrite.has(cloudNote.id)) {
        notesToWrite.set(
          cloudNote.id,
          sanitizeNoteTimestamps(
            { ...cloudNote, trashedAt: input.now },
            input.now,
          ),
        );
      }
    }
  }

  return { notesToWrite: [...notesToWrite.values()], foldersToWrite };
}
