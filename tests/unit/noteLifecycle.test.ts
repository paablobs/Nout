import { describe, expect, it } from "vitest";
import {
  TRASH_RETENTION_MS,
  selectPurgeIds,
} from "../../src/utils/noteLifecycle";
import type { Note } from "../../src/repositories/types";

const note = (overrides: Partial<Note>): Note => ({
  id: "n1",
  text: "",
  isFav: false,
  isTrash: true,
  isHidden: false,
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
});

describe("selectPurgeIds", () => {
  const now = 1_700_000_000_000;

  it("purges notes trashed exactly the retention period ago", () => {
    const notes = { n1: note({ trashedAt: now - TRASH_RETENTION_MS }) };
    expect(selectPurgeIds(notes, now)).toEqual(["n1"]);
  });

  it("keeps notes trashed less than the retention period ago", () => {
    const notes = { n1: note({ trashedAt: now - TRASH_RETENTION_MS + 1 }) };
    expect(selectPurgeIds(notes, now)).toEqual([]);
  });

  it("never purges legacy trashed notes without trashedAt", () => {
    const notes = { n1: note({ trashedAt: undefined }) };
    expect(selectPurgeIds(notes, Date.now())).toEqual([]);
  });

  it("never purges non-trashed notes with a stale trashedAt", () => {
    const notes = {
      n1: note({ isTrash: false, trashedAt: 1 }),
    };
    expect(selectPurgeIds(notes, Date.now())).toEqual([]);
  });

  it("ignores a zero trashedAt", () => {
    const notes = { n1: note({ trashedAt: 0 }) };
    expect(selectPurgeIds(notes, Date.now())).toEqual([]);
  });
});
