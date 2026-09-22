import { describe, expect, it, vi } from "vitest";
import { NoteMutationQueue } from "../../src/utils/noteMutationQueue";
import type { Note } from "../../src/repositories/types";

const note = (overrides: Partial<Note> = {}): Note => ({
  id: "n1",
  text: "old",
  isFav: false,
  isTrash: false,
  isHidden: false,
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

describe("NoteMutationQueue", () => {
  it("coalesces a debounced text edit with an immediate flag change", async () => {
    const writes: Note[] = [];
    const queue = new NoteMutationQueue(
      async (value) => {
        writes.push(value);
      },
      { debounceMs: 400, onError: vi.fn() },
    );

    queue.schedule(note({ text: "edited", updatedAt: 2 }));
    const pending = queue.getLatest("n1");
    expect(pending).toBeDefined();
    queue.enqueue({ ...pending!, isFav: true });
    await queue.flushAndWait();

    expect(writes).toEqual([
      note({ text: "edited", updatedAt: 2, isFav: true }),
    ]);
  });

  it("continues with later mutations when an earlier write fails", async () => {
    const writes: Note[] = [];
    const onError = vi.fn();
    const queue = new NoteMutationQueue(
      async (value) => {
        writes.push(value);
        if (value.isFav) throw new Error("offline");
      },
      { debounceMs: 0, onError },
    );

    queue.enqueue(note({ isFav: true }));
    queue.enqueue(note({ isHidden: true }));
    await queue.flushAndWait();

    expect(writes).toEqual([note({ isFav: true }), note({ isHidden: true })]);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("rolls back speculative folder deletion state after a failed operation", async () => {
    const writes: Note[] = [];
    const onError = vi.fn();
    const queue = new NoteMutationQueue(
      async (value) => {
        writes.push(value);
      },
      {
        debounceMs: 0,
        retainLatestUntilObserved: true,
        onError,
      },
    );
    const original = note({ folderId: "f1" });

    queue.schedule(original);
    queue.enqueueAtomic(
      [note({ folderId: undefined, isTrash: true })],
      async () => {
        throw new Error("folder write failed");
      },
    );
    await queue.flushAndWait();

    expect(queue.getLatest("n1")).toEqual(original);
    expect(onError).toHaveBeenCalledTimes(1);
    queue.enqueue({ ...queue.getLatest("n1")!, isFav: true });
    await queue.flushAndWait();
    expect(writes.at(-1)).toEqual({ ...original, isFav: true });
  });

  it("uses fresh snapshot state after a partially committed bounded operation", async () => {
    const writes: Note[] = [];
    const queue = new NoteMutationQueue(
      async (value) => {
        writes.push(value);
      },
      {
        debounceMs: 0,
        retainLatestUntilObserved: true,
        onError: vi.fn(),
      },
    );
    queue.schedule(note({ text: "edited", updatedAt: 2, folderId: "f1" }));
    queue.enqueueAtomic(
      [
        note({
          text: "edited",
          updatedAt: 2,
          folderId: undefined,
          isTrash: true,
        }),
      ],
      async () => {
        throw new Error("chunk failed");
      },
      vi.fn(),
      { rollbackOnFailure: false },
    );
    await queue.flushAndWait();

    expect(writes).toEqual([
      note({ text: "edited", updatedAt: 2, folderId: "f1" }),
    ]);
    expect(queue.getLatest("n1")).toBeUndefined();
    const snapshotAfterPartialCommit = note({
      text: "edited",
      updatedAt: 2,
      folderId: undefined,
      isTrash: true,
    });
    queue.observe({ n1: snapshotAfterPartialCommit });
    queue.enqueue({ ...snapshotAfterPartialCommit, isFav: true });
    await queue.flushAndWait();
    expect(writes.at(-1)).toEqual(
      note({
        text: "edited",
        updatedAt: 2,
        folderId: undefined,
        isTrash: true,
        isFav: true,
      }),
    );
  });

  it("waits for earlier note writes before an atomic operation", async () => {
    const events: string[] = [];
    let release!: () => void;
    const firstWrite = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queue = new NoteMutationQueue(
      async () => {
        events.push("note");
        await firstWrite;
      },
      { debounceMs: 0, onError: vi.fn() },
    );

    queue.enqueue(note());
    queue.enqueueAtomic([note({ isTrash: true })], async () => {
      events.push("atomic");
    });
    await Promise.resolve();
    expect(events).toEqual(["note"]);

    release();
    await queue.flushAndWait();
    expect(events).toEqual(["note", "atomic"]);
  });

  it("orders permanent removal after an in-flight edit", async () => {
    const events: string[] = [];
    const queue = new NoteMutationQueue(
      async () => {
        events.push("write");
      },
      { debounceMs: 400, onError: vi.fn() },
    );

    queue.enqueue(note({ text: "edited", updatedAt: 2 }));
    queue.enqueueOperation(["n1"], async () => {
      events.push("remove");
    });
    await queue.flushAndWait();

    expect(events).toEqual(["write", "remove"]);
  });

  it("flushes a pending edit when its owner is unmounted or changes account", async () => {
    const writes: Note[] = [];
    const queue = new NoteMutationQueue(
      async (value) => {
        writes.push(value);
      },
      { debounceMs: 400, onError: vi.fn() },
    );

    queue.schedule(note({ text: "before unmount", updatedAt: 2 }));
    await queue.flushAndWait();

    expect(writes).toEqual([note({ text: "before unmount", updatedAt: 2 })]);
  });
});
