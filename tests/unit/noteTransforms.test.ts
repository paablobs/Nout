import { describe, expect, it } from "vitest";
import {
  createNote,
  planFolderDeletion,
  withFolderMoved,
  withRestored,
  withTrashed,
  withToggledFavorite,
  withToggledHidden,
  withUpdatedText,
} from "../../src/utils/noteTransforms";
import type { Note } from "../../src/repositories/types";

const note = (overrides: Partial<Note> = {}): Note => ({
  id: "n1",
  text: "hello",
  isFav: false,
  isTrash: false,
  isHidden: false,
  createdAt: 100,
  updatedAt: 100,
  ...overrides,
});

describe("createNote", () => {
  it("creates an empty note with matching timestamps and a uuid", () => {
    const created = createNote(1000);
    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(created).toEqual(
      expect.objectContaining({
        text: "",
        isFav: false,
        isTrash: false,
        isHidden: false,
        createdAt: 1000,
        updatedAt: 1000,
      }),
    );
    expect("folderId" in created).toBe(false);
  });

  it("applies favorite and folder options", () => {
    const created = createNote(1000, { isFav: true, folderId: "f1" });
    expect(created.isFav).toBe(true);
    expect(created.folderId).toBe("f1");
  });
});

describe("note transforms", () => {
  it("withUpdatedText bumps only updatedAt", () => {
    const updated = withUpdatedText(note(), "new text", 500);
    expect(updated.text).toBe("new text");
    expect(updated.updatedAt).toBe(500);
    expect(updated.createdAt).toBe(100);
  });

  it("withToggledFavorite does not bump updatedAt", () => {
    const updated = withToggledFavorite(note());
    expect(updated.isFav).toBe(true);
    expect(updated.updatedAt).toBe(100);
  });

  it("withToggledHidden does not bump updatedAt", () => {
    const updated = withToggledHidden(note());
    expect(updated.isHidden).toBe(true);
    expect(updated.updatedAt).toBe(100);
  });

  it("withTrashed marks the note and records when", () => {
    const updated = withTrashed(note(), 900);
    expect(updated.isTrash).toBe(true);
    expect(updated.trashedAt).toBe(900);
  });

  it("withRestored clears trash state and drops trashedAt", () => {
    const restored = withRestored(
      note({ isTrash: true, isHidden: true, trashedAt: 900 }),
    );
    expect(restored.isTrash).toBe(false);
    expect(restored.isHidden).toBe(false);
    expect("trashedAt" in restored).toBe(false);
  });

  it("withFolderMoved assigns and clears folderId", () => {
    expect(withFolderMoved(note(), "f1").folderId).toBe("f1");
    expect("folderId" in withFolderMoved(note({ folderId: "f1" }), null)).toBe(
      false,
    );
  });
});

describe("planFolderDeletion", () => {
  it("trashes the folder notes and strips their folderId", () => {
    const notes = {
      inside: note({ id: "inside", folderId: "f1", isHidden: true }),
      outside: note({ id: "outside" }),
    };
    const plan = planFolderDeletion(notes, "f1", 1000);

    expect(plan.nextNotes.inside).toEqual({
      ...notes.inside,
      isHidden: false,
      folderId: undefined,
      isTrash: true,
      trashedAt: 1000,
    });
    expect(plan.nextNotes.outside).toBe(notes.outside);
    expect(plan.trashedNotes).toEqual([plan.nextNotes.inside]);
  });

  it("leaves everything alone when the folder has no notes", () => {
    const notes = { outside: note({ id: "outside" }) };
    const plan = planFolderDeletion(notes, "f1", 1000);
    expect(plan.trashedNotes).toEqual([]);
    expect(plan.nextNotes).toEqual(notes);
  });
});
