import { describe, expect, it } from "vitest";
import {
  compareByUpdatedAtDesc,
  searchNotes,
  sortByTrashedAtDesc,
  sortByUpdatedAtDesc,
} from "../../src/utils/noteQuery";
import type { Note } from "../../src/repositories/types";

const note = (overrides: Partial<Note>): Note => ({
  id: "n1",
  text: "",
  isFav: false,
  isTrash: false,
  isHidden: false,
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
});

describe("searchNotes", () => {
  const notes = [
    note({ id: "a", text: "<p>Shopping list: <b>milk</b></p>" }),
    note({ id: "b", text: "<p>Workout plan</p>" }),
    note({ id: "c", text: "" }),
  ];

  it("matches case-insensitively across stripped html", () => {
    const results = searchNotes(notes, "MILK");
    expect(results.map((n) => n.id)).toEqual(["a"]);
  });

  it("matches plain text anywhere in the note", () => {
    const results = searchNotes(notes, "plan");
    expect(results.map((n) => n.id)).toEqual(["b"]);
  });

  it("returns everything for an empty query", () => {
    expect(searchNotes(notes, "   ")).toBe(notes);
  });
});

describe("sorting", () => {
  it("sorts by updatedAt descending with legacy notes last", () => {
    const notes = [
      note({ id: "legacy", updatedAt: 0, createdAt: 0 }),
      note({ id: "old", updatedAt: 100, createdAt: 50 }),
      note({ id: "new", updatedAt: 300, createdAt: 300 }),
    ];
    expect(sortByUpdatedAtDesc(notes).map((n) => n.id)).toEqual([
      "new",
      "old",
      "legacy",
    ]);
  });

  it("breaks ties by createdAt", () => {
    const notes = [
      note({ id: "younger-create", updatedAt: 100, createdAt: 200 }),
      note({ id: "older-create", updatedAt: 100, createdAt: 50 }),
    ];
    expect(sortByUpdatedAtDesc(notes).map((n) => n.id)).toEqual([
      "younger-create",
      "older-create",
    ]);
  });

  it("is stable for notes with identical timestamps", () => {
    const notes = [
      note({ id: "first", updatedAt: 100, createdAt: 100 }),
      note({ id: "second", updatedAt: 100, createdAt: 100 }),
    ];
    expect(sortByUpdatedAtDesc(notes).map((n) => n.id)).toEqual([
      "first",
      "second",
    ]);
  });

  it("sorts trash by trashedAt descending", () => {
    const notes = [
      note({ id: "old-trash", isTrash: true, trashedAt: 100 }),
      note({ id: "new-trash", isTrash: true, trashedAt: 300 }),
      note({ id: "legacy-trash", isTrash: true }),
    ];
    expect(sortByTrashedAtDesc(notes).map((n) => n.id)).toEqual([
      "new-trash",
      "old-trash",
      "legacy-trash",
    ]);
  });

  it("compareByUpdatedAtDesc does not mutate inputs", () => {
    const a = note({ id: "a", updatedAt: 1 });
    const b = note({ id: "b", updatedAt: 2 });
    expect(compareByUpdatedAtDesc(a, b)).toBe(1);
    expect(compareByUpdatedAtDesc(b, a)).toBe(-1);
    expect(compareByUpdatedAtDesc(a, a)).toBe(0);
  });
});
