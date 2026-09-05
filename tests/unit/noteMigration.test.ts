import { describe, expect, it } from "vitest";
import { planMigration } from "../../src/utils/noteMigration";
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

describe("planMigration", () => {
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
});
