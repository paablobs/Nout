import { describe, expect, it } from "vitest";
import {
  filterNotes,
  getFirstSelectableNoteId,
  isNoteVisibleInView,
} from "../../src/utils/filteredNotes";
import { selectedView } from "../../src/utils/selectedView";
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

describe("filterNotes", () => {
  const notes = {
    plain: note({ id: "plain", updatedAt: 10 }),
    fav: note({ id: "fav", isFav: true, updatedAt: 20 }),
    hiddenFav: note({ id: "hiddenFav", isFav: true, isHidden: true }),
    trashed: note({ id: "trashed", isTrash: true, trashedAt: 5 }),
    inFolder: note({ id: "inFolder", folderId: "f1", updatedAt: 30 }),
    hiddenInFolder: note({
      id: "hiddenInFolder",
      folderId: "f1",
      isHidden: true,
    }),
  };

  it("Notes view shows non-trash, non-hidden notes", () => {
    const ids = filterNotes(notes, selectedView.NOTES, null).map((n) => n.id);
    expect(ids).toContain("plain");
    expect(ids).toContain("fav");
    expect(ids).toContain("inFolder");
    expect(ids).not.toContain("trashed");
    expect(ids).not.toContain("hiddenFav");
    expect(ids).not.toContain("hiddenInFolder");
  });

  it("Favorites view excludes hidden favorites", () => {
    const ids = filterNotes(notes, selectedView.FAVORITES, null).map(
      (n) => n.id,
    );
    expect(ids).toEqual(["fav"]);
  });

  it("Folders view keeps hidden notes visible inside their folder", () => {
    const ids = filterNotes(notes, selectedView.FOLDERS, "f1").map((n) => n.id);
    expect(ids.sort()).toEqual(["hiddenInFolder", "inFolder"].sort());
  });

  it("Trash view shows only trashed notes", () => {
    const ids = filterNotes(notes, selectedView.TRASH, null).map((n) => n.id);
    expect(ids).toEqual(["trashed"]);
  });
});

describe("getFirstSelectableNoteId", () => {
  it("picks the most recently updated note in the Notes view", () => {
    const notes = {
      a: note({ id: "a", updatedAt: 10 }),
      b: note({ id: "b", updatedAt: 99 }),
    };
    expect(getFirstSelectableNoteId(notes, selectedView.NOTES, null)).toBe("b");
  });

  it("sorts trash by the most recent trashedAt", () => {
    const notes = {
      a: note({ id: "a", isTrash: true, trashedAt: 10 }),
      b: note({ id: "b", isTrash: true, trashedAt: 99 }),
    };
    expect(getFirstSelectableNoteId(notes, selectedView.TRASH, null)).toBe("b");
  });

  it("returns null for the scratchpad", () => {
    expect(
      getFirstSelectableNoteId({}, selectedView.SCRATCHPAD, null),
    ).toBeNull();
  });
});

describe("isNoteVisibleInView", () => {
  it("null note is never visible", () => {
    expect(isNoteVisibleInView(null, selectedView.NOTES, null)).toBe(false);
  });

  it("hidden note is visible in its folder but not in Notes", () => {
    const hidden = note({ id: "h", isHidden: true, folderId: "f1" });
    expect(isNoteVisibleInView(hidden, selectedView.NOTES, null)).toBe(false);
    expect(isNoteVisibleInView(hidden, selectedView.FOLDERS, "f1")).toBe(true);
  });
});
