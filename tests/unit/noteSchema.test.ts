import { describe, expect, it } from "vitest";
import { backfillTrashedAt, normalizeNote } from "../../src/utils/noteSchema";

const baseNote = {
  id: "n1",
  text: "hello",
  isFav: true,
  isTrash: false,
  isHidden: false,
  createdAt: 100,
  updatedAt: 200,
};

describe("normalizeNote", () => {
  it("keeps a fully valid note intact", () => {
    const note = normalizeNote({ ...baseNote, folderId: "f1" });
    expect(note).toEqual({ ...baseNote, folderId: "f1" });
  });

  it("strips legacy category fields", () => {
    const note = normalizeNote({ ...baseNote, category: "Notes" });
    expect(note).toEqual(baseNote);
    expect("category" in note).toBe(false);
  });

  it("defaults missing timestamps to zero", () => {
    const note = normalizeNote({
      id: "n1",
      text: "legacy",
      isFav: false,
      isTrash: false,
      isHidden: false,
    });
    expect(note.createdAt).toBe(0);
    expect(note.updatedAt).toBe(0);
  });

  it("coerces invalid types to safe defaults", () => {
    const note = normalizeNote({
      id: 42,
      text: null,
      isFav: "yes",
      isTrash: 1,
      isHidden: undefined,
      createdAt: "100",
      updatedAt: {},
      folderId: 7,
      trashedAt: "soon",
    });
    expect(note).toEqual({
      id: "",
      text: "",
      isFav: false,
      isTrash: false,
      isHidden: false,
      createdAt: 0,
      updatedAt: 0,
    });
  });

  it("returns a safe note for null input", () => {
    expect(normalizeNote(null)).toEqual({
      id: "",
      text: "",
      isFav: false,
      isTrash: false,
      isHidden: false,
      createdAt: 0,
      updatedAt: 0,
    });
  });
});

describe("backfillTrashedAt", () => {
  it("sets trashedAt on legacy trashed notes", () => {
    const notes = {
      n1: { ...baseNote, id: "n1", isTrash: true },
      n2: { ...baseNote, id: "n2" },
    };
    const result = backfillTrashedAt(notes, 1000);
    expect(result.n1.trashedAt).toBe(1000);
    expect(result.n2.trashedAt).toBeUndefined();
  });

  it("returns the same record when nothing needs backfilling", () => {
    const notes = {
      n1: { ...baseNote, id: "n1", isTrash: true, trashedAt: 500 },
    };
    expect(backfillTrashedAt(notes, 1000)).toBe(notes);
  });
});
