import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";

const VALID_NOTE = {
  id: "n1",
  text: "first note",
  isFav: false,
  isTrash: false,
  isHidden: false,
  createdAt: 1000,
  updatedAt: 2000,
};

describe("Firestore security rules", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    const rules = readFileSync(
      resolve(process.cwd(), "firestore.rules"),
      "utf8",
    );

    testEnv = await initializeTestEnvironment({
      projectId: "demo-nout",
      firestore: {
        host: "127.0.0.1",
        port: 8080,
        rules,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it("denies unauthenticated access", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const ref = db.doc("users/alice/notes/n1");

    await assertFails(ref.get());
    await assertFails(ref.set(VALID_NOTE));
  });

  it("allows owner to write/read a valid note", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const ref = db.doc("users/alice/notes/n1");

    await assertSucceeds(ref.set(VALID_NOTE));

    await assertSucceeds(ref.get());
  });

  it("denies writes with invalid note schema", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const ref = db.doc("users/alice/notes/n1");

    await assertFails(ref.set({ ...VALID_NOTE, text: 10 }));

    await assertFails(ref.set({ ...VALID_NOTE, isAdmin: true }));

    await assertFails(ref.set({ ...VALID_NOTE, createdAt: "1000" }));

    await assertFails(
      ref.set({ ...VALID_NOTE, updatedAt: VALID_NOTE.createdAt - 1 }),
    );
  });

  it("denies cross-user read and write", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const seedDb = context.firestore();
      await seedDb.doc("users/alice/notes/n1").set(VALID_NOTE);
    });

    const bobDb = testEnv.authenticatedContext("bob").firestore();
    const aliceRef = bobDb.doc("users/alice/notes/n1");

    await assertFails(aliceRef.get());
    await assertFails(aliceRef.set({ ...VALID_NOTE, text: "hacked" }));
  });

  it("allows owner CRUD for folders", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const ref = db.doc("users/alice/folders/f1");

    await assertSucceeds(
      ref.set({
        id: "f1",
        name: "Personal",
        color: "#abcdef",
      }),
    );

    await assertSucceeds(ref.get());
    await assertSucceeds(ref.delete());
  });

  it("enforces scratchpad schema", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const ref = db.doc("users/alice/meta/scratchpad");

    await assertSucceeds(ref.set({ value: "quick notes" }));

    await assertFails(
      ref.set({
        value: "quick notes",
        extra: true,
      }),
    );
  });
});
