import { describe, expect, it } from "vitest";
import { excludeNoteIds, planMigration } from "../../src/utils/noteMigration";
import {
  fingerprintFolder,
  fingerprintNote,
  type MigrationLedger,
} from "../../src/utils/localMigrationLedger";
import type { Folder, Note } from "../../src/repositories/types";

const note = (overrides: Partial<Note>): Note => ({
  id: "n1",
  text: "hello",
  isFav: false,
  isTrash: false,
  isHidden: false,
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
});

const folder = (overrides: Partial<Folder> = {}): Folder => ({
  id: "f1",
  name: "Work",
  ...overrides,
});

const ledgerFor = (
  notes: Note[] = [],
  folders: Folder[] = [],
): MigrationLedger => ({
  notes: Object.fromEntries(
    notes.map((item) => [item.id, fingerprintNote(item)]),
  ),
  folders: Object.fromEntries(
    folders.map((item) => [item.id, fingerprintFolder(item)]),
  ),
});

describe("planMigration", () => {
  it("excludes notes permanently deleted while migration is in flight", () => {
    const notes = [note({ id: "n1" }), note({ id: "n2" })];

    expect(excludeNoteIds(notes, new Set(["n1"]))).toEqual([notes[1]]);
  });

  it("seeds local notes and folders missing from the cloud", () => {
    const plan = planMigration({
      localNotes: { n1: note({ updatedAt: 10 }), n2: note({ id: "n2" }) },
      localFolders: [folder()],
      cloudNotes: {},
      cloudFolders: [],
      now: 1000,
    });

    expect(plan.notesToWrite.map((n) => n.id).sort()).toEqual(["n1", "n2"]);
    expect(plan.foldersToWrite).toEqual([folder()]);
  });

  it("prefers the local note when it is newer", () => {
    const local = note({ updatedAt: 200, text: "local edit" });
    const cloud = note({ updatedAt: 100, text: "cloud edit" });
    const plan = planMigration({
      localNotes: { n1: local },
      localFolders: [],
      cloudNotes: { n1: cloud },
      cloudFolders: [],
      now: 1000,
    });

    expect(plan.notesToWrite).toEqual([local]);
  });

  it("keeps the cloud note when it is newer", () => {
    const local = note({ updatedAt: 100, text: "local edit" });
    const cloud = note({ updatedAt: 200, text: "cloud edit" });
    const plan = planMigration({
      localNotes: { n1: local },
      localFolders: [],
      cloudNotes: { n1: cloud },
      cloudFolders: [],
      now: 1000,
    });

    expect(plan.notesToWrite).toEqual([]);
  });

  it("keeps the cloud note on a tie (legacy notes)", () => {
    const local = note({ updatedAt: 0, text: "local" });
    const cloud = note({ updatedAt: 0, text: "cloud" });
    const plan = planMigration({
      localNotes: { n1: local },
      localFolders: [],
      cloudNotes: { n1: cloud },
      cloudFolders: [],
      now: 1000,
    });

    expect(plan.notesToWrite).toEqual([]);
  });

  it("lets a real timestamp beat a legacy zero timestamp", () => {
    const local = note({ updatedAt: 0 });
    const cloud = note({ updatedAt: 1 });
    const plan = planMigration({
      localNotes: { n1: local },
      localFolders: [],
      cloudNotes: { n1: cloud },
      cloudFolders: [],
      now: 1000,
    });

    expect(plan.notesToWrite).toEqual([]);
  });

  it("backfills trashedAt on local trashed notes being uploaded", () => {
    const local = note({ isTrash: true });
    const plan = planMigration({
      localNotes: { n1: local },
      localFolders: [],
      cloudNotes: {},
      cloudFolders: [],
      now: 1000,
    });

    expect(plan.notesToWrite).toEqual([{ ...local, trashedAt: 1000 }]);
  });

  it("backfills trashedAt on legacy cloud trashed notes", () => {
    const cloud = note({ isTrash: true, id: "c1" });
    const plan = planMigration({
      localNotes: {},
      localFolders: [],
      cloudNotes: { c1: cloud },
      cloudFolders: [],
      now: 1000,
    });

    expect(plan.notesToWrite).toEqual([{ ...cloud, trashedAt: 1000 }]);
  });

  it("does not let cloud trash backfill overwrite a newer local note", () => {
    const local = note({
      updatedAt: 200,
      text: "local edit",
      isTrash: false,
    });
    const cloud = note({
      updatedAt: 100,
      text: "cloud edit",
      isTrash: true,
      trashedAt: undefined,
    });

    const plan = planMigration({
      localNotes: { n1: local },
      localFolders: [],
      cloudNotes: { n1: cloud },
      cloudFolders: [],
      now: 1000,
    });

    expect(plan.notesToWrite).toEqual([local]);
  });

  it("skips folders that already exist in the cloud", () => {
    const plan = planMigration({
      localNotes: {},
      localFolders: [folder()],
      cloudNotes: {},
      cloudFolders: [folder({ name: "Renamed remotely" })],
      now: 1000,
    });

    expect(plan.foldersToWrite).toEqual([]);
  });

  it("does not resurrect an unchanged local note deleted from the cloud", () => {
    const local = note({ updatedAt: 100 });
    const plan = planMigration({
      localNotes: { n1: local },
      localFolders: [],
      cloudNotes: {},
      cloudFolders: [],
      now: 1000,
      migrationLedger: ledgerFor([local]),
    });

    expect(plan.notesToWrite).toEqual([]);
  });

  it("migrates a local note changed without an updatedAt change", () => {
    const migrated = note({ updatedAt: 100, isFav: false });
    const changed = note({ updatedAt: 100, isFav: true });
    const plan = planMigration({
      localNotes: { n1: changed },
      localFolders: [],
      cloudNotes: { n1: migrated },
      cloudFolders: [],
      now: 1000,
      migrationLedger: ledgerFor([migrated]),
    });

    expect(plan.notesToWrite).toEqual([changed]);
  });

  it("migrates a changed local folder after its cloud copy was removed", () => {
    const migrated = folder({ name: "Work" });
    const changed = folder({ name: "Projects" });
    const plan = planMigration({
      localNotes: {},
      localFolders: [changed],
      cloudNotes: {},
      cloudFolders: [],
      now: 1000,
      migrationLedger: ledgerFor([], [migrated]),
    });

    expect(plan.foldersToWrite).toEqual([changed]);
  });

  it("does not resurrect an unchanged local folder deleted from the cloud", () => {
    const local = folder();
    const plan = planMigration({
      localNotes: {},
      localFolders: [local],
      cloudNotes: {},
      cloudFolders: [],
      now: 1000,
      migrationLedger: ledgerFor([], [local]),
    });

    expect(plan.foldersToWrite).toEqual([]);
  });
});
