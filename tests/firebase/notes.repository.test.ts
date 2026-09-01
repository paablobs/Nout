import { describe, expect, it } from "vitest";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  inMemoryPersistence,
  setPersistence,
  signInAnonymously,
  signOut,
  type Auth,
} from "firebase/auth";
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  onSnapshot,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import { createCloudNotesRepository } from "../../src/repositories/cloud/CloudNotesRepository";
import { createCloudFoldersRepository } from "../../src/repositories/cloud/CloudFoldersRepository";
import { normalizeNote } from "../../src/utils/noteSchema";
import type { Note } from "../../src/repositories/types";

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: "note-1",
  text: "integration note",
  isFav: false,
  isTrash: false,
  isHidden: false,
  createdAt: 1000,
  updatedAt: 2000,
  ...overrides,
});

const waitFor = async (
  predicate: () => boolean,
  timeoutMs = 5000,
): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return predicate();
};

describe("Cloud repositories against the emulator", () => {
  let app: FirebaseApp;
  let auth: Auth;
  let firestore: Firestore;
  let uid: string;

  beforeAll(async () => {
    app = initializeApp(
      { projectId: "demo-nout", apiKey: "demo-api-key" },
      "repo-integration-test",
    );
    auth = getAuth(app);
    await setPersistence(auth, inMemoryPersistence);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    const credential = await signInAnonymously(auth);
    uid = credential.user.uid;
    firestore = initializeFirestore(app, {});
    connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
  });

  afterAll(async () => {
    if (auth) {
      await signOut(auth);
    }
    await deleteApp(app);
  });

  const notesRepo = () => createCloudNotesRepository(firestore, uid);
  const foldersRepo = () => createCloudFoldersRepository(firestore, uid);

  beforeEach(async () => {
    const notes = await notesRepo().getAll();
    await notesRepo().removeBatch(Object.keys(notes));
    for (const folder of await foldersRepo().getAll()) {
      await foldersRepo().remove(folder.id);
    }
  });

  it("denies writes for unauthenticated clients", async () => {
    const anonApp = initializeApp(
      { projectId: "demo-nout", apiKey: "demo-api-key" },
      "repo-integration-anon",
    );
    const anonFirestore = initializeFirestore(anonApp, {});
    connectFirestoreEmulator(anonFirestore, "127.0.0.1", 8080);
    try {
      await expect(
        setDoc(
          doc(anonFirestore, `users/${uid}/notes/x`),
          makeNote({ id: "x" }),
        ),
      ).rejects.toThrow();
    } finally {
      await deleteApp(anonApp);
    }
  });

  it("round-trips notes through upsert and getAll", async () => {
    const repo = notesRepo();

    await repo.upsert(makeNote());
    await repo.upsert(makeNote({ id: "note-2", text: "second" }));

    const all = await repo.getAll();
    expect(Object.keys(all).sort()).toEqual(["note-1", "note-2"]);
    expect(all["note-1"].text).toBe("integration note");
    expect(all["note-1"].createdAt).toBe(1000);
  });

  it("strips undefined optional fields when writing documents", async () => {
    const repo = notesRepo();

    const note = makeNote({ folderId: undefined, trashedAt: undefined });
    await repo.upsert(note);

    const snapshot = await getDoc(doc(firestore, `users/${uid}/notes/note-1`));
    expect(snapshot.exists()).toBe(true);
    expect(snapshot.data()).toEqual({
      id: "note-1",
      text: "integration note",
      isFav: false,
      isTrash: false,
      isHidden: false,
      createdAt: 1000,
      updatedAt: 2000,
    });
  });

  it("writes and removes batches", async () => {
    const repo = notesRepo();

    await repo.upsertBatch([
      makeNote({ id: "a" }),
      makeNote({ id: "b" }),
      makeNote({ id: "c" }),
    ]);
    expect(Object.keys(await repo.getAll()).sort()).toEqual(["a", "b", "c"]);

    await repo.removeBatch(["a", "b"]);
    expect(Object.keys(await repo.getAll()).sort()).toEqual(["c"]);
  });

  it("converges through onSnapshot after repository writes", async () => {
    const repo = notesRepo();

    const seen: Record<string, Note>[] = [];
    const unsubscribe = onSnapshot(
      collection(firestore, "users", uid, "notes"),
      (snapshot) => {
        const record: Record<string, Note> = {};
        snapshot.docs.forEach((item) => {
          record[item.id] = normalizeNote(item.data());
        });
        seen.push(record);
      },
    );

    try {
      await repo.upsert(makeNote({ text: "live note" }));
      const arrived = await waitFor(() =>
        seen.some((record) => record["note-1"]?.text === "live note"),
      );
      expect(arrived).toBe(true);

      await repo.upsert(makeNote({ text: "edited live" }));
      const edited = await waitFor(() =>
        seen.some((record) => record["note-1"]?.text === "edited live"),
      );
      expect(edited).toBe(true);
    } finally {
      unsubscribe();
    }
  });

  it("round-trips folders with optional color stripped", async () => {
    const repo = foldersRepo();

    await repo.upsert({ id: "f1", name: "Work", color: "#ff0000" });
    await repo.upsert({ id: "f2", name: "No color" });

    const folders = await repo.getAll();
    expect(folders.sort((a, b) => a.id.localeCompare(b.id))).toEqual([
      { id: "f1", name: "Work", color: "#ff0000" },
      { id: "f2", name: "No color" },
    ]);

    await repo.remove("f1");
    const remaining = await repo.getAll();
    expect(remaining).toEqual([{ id: "f2", name: "No color" }]);
  });

  it("reads what the raw SDK can verify", async () => {
    await notesRepo().upsert(makeNote());
    const snapshot = await getDocs(
      collection(firestore, "users", uid, "notes"),
    );
    expect(snapshot.size).toBe(1);
  });
});
