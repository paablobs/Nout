import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalFoldersRepository } from "../../src/repositories/local/LocalFoldersRepository";
import { createLocalNotesRepository } from "../../src/repositories/local/LocalNotesRepository";
import type { Folder, Note } from "../../src/repositories/types";

const storage = new Map<string, string>();

vi.mock("../../src/utils/localStorageHelper", () => ({
  getLocalStorageItem: (key: string) => storage.get(key) ?? null,
  setLocalStorageItem: (key: string, value: unknown) =>
    storage.set(key, JSON.stringify(value)),
}));

const note = (id: string): Note => ({
  id,
  text: id,
  isFav: false,
  isTrash: false,
  isHidden: false,
  createdAt: 1,
  updatedAt: 1,
});

const folder = (id: string): Folder => ({ id, name: id });

describe("local repositories", () => {
  beforeEach(() => storage.clear());

  it("keeps parallel note upserts for different IDs", async () => {
    const repository = createLocalNotesRepository();

    await Promise.all([
      repository.upsert(note("n1")),
      repository.upsert(note("n2")),
    ]);

    expect(await repository.getAll()).toEqual({
      n1: note("n1"),
      n2: note("n2"),
    });
  });

  it("keeps parallel folder upserts for different IDs", async () => {
    const repository = createLocalFoldersRepository();

    await Promise.all([
      repository.upsert(folder("f1")),
      repository.upsert(folder("f2")),
    ]);

    expect(await repository.getAll()).toEqual([folder("f2"), folder("f1")]);
  });
});
