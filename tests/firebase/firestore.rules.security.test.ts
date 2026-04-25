import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";

/**
 * Aggressive security tests for Firestore rules.
 * Tries every vector an attacker might use:
 *   - unauthenticated access on every path
 *   - cross-user read / write / delete
 *   - schema bypass (extra fields, missing fields, wrong types)
 *   - boundary values (max length, empty strings, huge payloads)
 *   - document-ID ↔ data.id mismatch
 *   - arbitrary subcollection / path-traversal
 *   - root-level document writes
 *   - listing / querying other users' collections
 *   - batch-write escalation
 */

const VALID_NOTE = {
  id: "n1",
  text: "hello",
  category: "Notes",
  isFav: false,
  isTrash: false,
  isHidden: false,
};

const VALID_FOLDER = {
  id: "f1",
  name: "Work",
  color: "#ff0000",
};

const VALID_SCRATCHPAD = { value: "quick note" };

const omit = <T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  key: K,
): Omit<T, K> =>
  Object.fromEntries(
    Object.entries(obj).filter(([entryKey]) => entryKey !== key),
  ) as Omit<T, K>;

describe("Firestore aggressive security tests", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    const rules = readFileSync(
      resolve(process.cwd(), "firestore.rules"),
      "utf8",
    );
    testEnv = await initializeTestEnvironment({
      projectId: "demo-nout",
      firestore: { host: "127.0.0.1", port: 8080, rules },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  // ─── helpers ──────────────────────────────────────────────────────────────

  const aliceDb = () => testEnv.authenticatedContext("alice").firestore();
  const bobDb = () => testEnv.authenticatedContext("bob").firestore();
  const anonDb = () => testEnv.unauthenticatedContext().firestore();

  const seed = async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await db.doc("users/alice/notes/n1").set(VALID_NOTE);
      await db
        .doc("users/alice/folders/f1")
        .set({ id: "f1", name: "Work", color: "#ff0000" });
      await db.doc("users/alice/meta/scratchpad").set(VALID_SCRATCHPAD);
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. UNAUTHENTICATED ACCESS – every path must be blocked
  // ═══════════════════════════════════════════════════════════════════════════

  describe("unauthenticated access", () => {
    beforeEach(seed);

    it("cannot read notes", async () => {
      await assertFails(anonDb().doc("users/alice/notes/n1").get());
    });

    it("cannot write notes", async () => {
      await assertFails(anonDb().doc("users/alice/notes/n2").set(VALID_NOTE));
    });

    it("cannot list notes collection", async () => {
      await assertFails(anonDb().collection("users/alice/notes").get());
    });

    it("cannot read folders", async () => {
      await assertFails(anonDb().doc("users/alice/folders/f1").get());
    });

    it("cannot write folders", async () => {
      await assertFails(
        anonDb().doc("users/alice/folders/f2").set(VALID_FOLDER),
      );
    });

    it("cannot list folders collection", async () => {
      await assertFails(anonDb().collection("users/alice/folders").get());
    });

    it("cannot read scratchpad", async () => {
      await assertFails(anonDb().doc("users/alice/meta/scratchpad").get());
    });

    it("cannot write scratchpad", async () => {
      await assertFails(
        anonDb().doc("users/alice/meta/scratchpad").set(VALID_SCRATCHPAD),
      );
    });

    it("cannot delete notes", async () => {
      await assertFails(anonDb().doc("users/alice/notes/n1").delete());
    });

    it("cannot delete folders", async () => {
      await assertFails(anonDb().doc("users/alice/folders/f1").delete());
    });

    it("cannot delete scratchpad", async () => {
      await assertFails(anonDb().doc("users/alice/meta/scratchpad").delete());
    });

    it("cannot read user document itself", async () => {
      await assertFails(anonDb().doc("users/alice").get());
    });

    it("cannot write to root-level collections", async () => {
      await assertFails(anonDb().doc("admin/config").set({ superAdmin: true }));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CROSS-USER ATTACKS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("cross-user attacks", () => {
    beforeEach(seed);

    it("bob cannot read alice's note", async () => {
      await assertFails(bobDb().doc("users/alice/notes/n1").get());
    });

    it("bob cannot update alice's note", async () => {
      await assertFails(
        bobDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, text: "pwned" }),
      );
    });

    it("bob cannot delete alice's note", async () => {
      await assertFails(bobDb().doc("users/alice/notes/n1").delete());
    });

    it("bob cannot list alice's notes", async () => {
      await assertFails(bobDb().collection("users/alice/notes").get());
    });

    it("bob cannot read alice's folder", async () => {
      await assertFails(bobDb().doc("users/alice/folders/f1").get());
    });

    it("bob cannot update alice's folder", async () => {
      await assertFails(
        bobDb()
          .doc("users/alice/folders/f1")
          .set({ ...VALID_FOLDER, name: "hacked" }),
      );
    });

    it("bob cannot delete alice's folder", async () => {
      await assertFails(bobDb().doc("users/alice/folders/f1").delete());
    });

    it("bob cannot list alice's folders", async () => {
      await assertFails(bobDb().collection("users/alice/folders").get());
    });

    it("bob cannot read alice's scratchpad", async () => {
      await assertFails(bobDb().doc("users/alice/meta/scratchpad").get());
    });

    it("bob cannot update alice's scratchpad", async () => {
      await assertFails(
        bobDb().doc("users/alice/meta/scratchpad").set({ value: "hacked" }),
      );
    });

    it("bob cannot delete alice's scratchpad", async () => {
      await assertFails(bobDb().doc("users/alice/meta/scratchpad").delete());
    });

    it("bob cannot create a note under alice's path", async () => {
      await assertFails(
        bobDb()
          .doc("users/alice/notes/injected")
          .set({ ...VALID_NOTE, id: "injected" }),
      );
    });

    it("bob cannot create a folder under alice's path", async () => {
      await assertFails(
        bobDb()
          .doc("users/alice/folders/injected")
          .set({ id: "injected", name: "evil" }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. USER DOCUMENT ITSELF & ROOT PATHS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("user document and root paths", () => {
    it("owner cannot read own user doc", async () => {
      await assertFails(aliceDb().doc("users/alice").get());
    });

    it("owner cannot write own user doc", async () => {
      await assertFails(
        aliceDb().doc("users/alice").set({ displayName: "Alice" }),
      );
    });

    it("owner cannot delete own user doc", async () => {
      await assertFails(aliceDb().doc("users/alice").delete());
    });

    it("cannot write to root-level 'admin' collection", async () => {
      await assertFails(aliceDb().doc("admin/config").set({ isAdmin: true }));
    });

    it("cannot write to root-level arbitrary collection", async () => {
      await assertFails(aliceDb().doc("secrets/passwords").set({ pw: "1234" }));
    });

    it("cannot list the users collection", async () => {
      await assertFails(aliceDb().collection("users").get());
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. ARBITRARY SUBCOLLECTIONS & PATH TRAVERSAL
  // ═══════════════════════════════════════════════════════════════════════════

  describe("arbitrary subcollections and path traversal", () => {
    it("denies creating arbitrary subcollection under user doc", async () => {
      await assertFails(
        aliceDb().doc("users/alice/evil/doc1").set({ data: "x" }),
      );
    });

    it("denies creating nested subcollection under notes", async () => {
      await assertFails(
        aliceDb().doc("users/alice/notes/n1/comments/c1").set({ body: "hi" }),
      );
    });

    it("denies creating nested subcollection under folders", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/folders/f1/subitems/s1")
          .set({ name: "sub" }),
      );
    });

    it("denies creating doc in meta other than scratchpad", async () => {
      await assertFails(
        aliceDb().doc("users/alice/meta/settings").set({ theme: "dark" }),
      );
    });

    it("denies creating deeply nested paths", async () => {
      await assertFails(
        aliceDb().doc("users/alice/a/b/c/d/e/f").set({ deep: true }),
      );
    });

    it("denies reading from arbitrary subcollection", async () => {
      await assertFails(aliceDb().doc("users/alice/tokens/refresh").get());
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. NOTES – SCHEMA VALIDATION ATTACKS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("note schema validation", () => {
    // ── Missing required fields ──────────────────────────────────────────

    it("rejects note without id", async () => {
      const noId = omit(VALID_NOTE, "id");
      await assertFails(aliceDb().doc("users/alice/notes/n1").set(noId));
    });

    it("rejects note without text", async () => {
      const noText = omit(VALID_NOTE, "text");
      await assertFails(aliceDb().doc("users/alice/notes/n1").set(noText));
    });

    it("rejects note without category", async () => {
      const noCat = omit(VALID_NOTE, "category");
      await assertFails(aliceDb().doc("users/alice/notes/n1").set(noCat));
    });

    it("rejects note without isFav", async () => {
      const no = omit(VALID_NOTE, "isFav");
      await assertFails(aliceDb().doc("users/alice/notes/n1").set(no));
    });

    it("rejects note without isTrash", async () => {
      const no = omit(VALID_NOTE, "isTrash");
      await assertFails(aliceDb().doc("users/alice/notes/n1").set(no));
    });

    it("rejects note without isHidden", async () => {
      const no = omit(VALID_NOTE, "isHidden");
      await assertFails(aliceDb().doc("users/alice/notes/n1").set(no));
    });

    // ── Wrong types ─────────────────────────────────────────────────────

    it("rejects note with numeric text", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, text: 999 }),
      );
    });

    it("rejects note with numeric id", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, id: 123 }),
      );
    });

    it("rejects note with string isFav", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, isFav: "true" }),
      );
    });

    it("rejects note with string isTrash", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, isTrash: "true" }),
      );
    });

    it("rejects note with string isHidden", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, isHidden: "false" }),
      );
    });

    it("rejects note with array category", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, category: ["Notes"] }),
      );
    });

    it("rejects note with boolean text", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, text: true }),
      );
    });

    it("rejects note with null text", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, text: null }),
      );
    });

    it("rejects note with object text", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, text: { rich: "content" } }),
      );
    });

    // ── Extra / injected fields ─────────────────────────────────────────

    it("rejects note with extra 'isAdmin' field", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, isAdmin: true }),
      );
    });

    it("rejects note with extra 'role' field", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, role: "admin" }),
      );
    });

    it("rejects note with extra 'uid' field", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, uid: "alice" }),
      );
    });

    it("rejects note with extra 'metadata' field", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, metadata: { created: "today" } }),
      );
    });

    it("rejects note with extra 'constructor' field", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, constructor: "evil" }),
      );
    });

    // ── ID mismatch ─────────────────────────────────────────────────────

    it("rejects note where data.id doesn't match document ID", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, id: "DIFFERENT" }),
      );
    });

    it("rejects note where data.id is empty", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, id: "" }),
      );
    });

    // ── Boundary values ─────────────────────────────────────────────────

    it("rejects note with text exceeding 50000 chars", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, text: "x".repeat(50001) }),
      );
    });

    it("allows note with text at exactly 50000 chars", async () => {
      await assertSucceeds(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, text: "x".repeat(50000) }),
      );
    });

    it("rejects note with empty category", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, category: "" }),
      );
    });

    it("rejects note with category exceeding 100 chars", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, category: "c".repeat(101) }),
      );
    });

    it("allows note with category at exactly 100 chars", async () => {
      await assertSucceeds(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, category: "c".repeat(100) }),
      );
    });

    it("allows note with empty text (0 chars)", async () => {
      await assertSucceeds(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, text: "" }),
      );
    });

    // ── optional folderId ───────────────────────────────────────────────

    it("allows note with valid folderId", async () => {
      await assertSucceeds(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, folderId: "f1" }),
      );
    });

    it("rejects note with folderId exceeding 128 chars", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, folderId: "x".repeat(129) }),
      );
    });

    it("rejects note with numeric folderId", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, folderId: 42 }),
      );
    });

    it("rejects note with boolean folderId", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, folderId: true }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. FOLDERS – SCHEMA VALIDATION ATTACKS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("folder schema validation", () => {
    it("rejects folder without name", async () => {
      await assertFails(
        aliceDb().doc("users/alice/folders/f1").set({ id: "f1" }),
      );
    });

    it("rejects folder without id", async () => {
      await assertFails(
        aliceDb().doc("users/alice/folders/f1").set({ name: "Work" }),
      );
    });

    it("rejects folder where data.id doesn't match doc ID", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/folders/f1")
          .set({ id: "WRONG", name: "Work" }),
      );
    });

    it("rejects folder with empty name", async () => {
      await assertFails(
        aliceDb().doc("users/alice/folders/f1").set({ id: "f1", name: "" }),
      );
    });

    it("rejects folder with name exceeding 80 chars", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/folders/f1")
          .set({ id: "f1", name: "a".repeat(81) }),
      );
    });

    it("allows folder with name at exactly 80 chars", async () => {
      await assertSucceeds(
        aliceDb()
          .doc("users/alice/folders/f1")
          .set({ id: "f1", name: "a".repeat(80) }),
      );
    });

    it("rejects folder with numeric name", async () => {
      await assertFails(
        aliceDb().doc("users/alice/folders/f1").set({ id: "f1", name: 123 }),
      );
    });

    it("rejects folder with boolean name", async () => {
      await assertFails(
        aliceDb().doc("users/alice/folders/f1").set({ id: "f1", name: true }),
      );
    });

    it("rejects folder with extra fields", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/folders/f1")
          .set({ id: "f1", name: "Work", color: "#fff", evil: true }),
      );
    });

    it("rejects folder with color exceeding 32 chars", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/folders/f1")
          .set({ id: "f1", name: "Work", color: "x".repeat(33) }),
      );
    });

    it("allows folder with color at exactly 32 chars", async () => {
      await assertSucceeds(
        aliceDb()
          .doc("users/alice/folders/f1")
          .set({ id: "f1", name: "Work", color: "x".repeat(32) }),
      );
    });

    it("rejects folder with numeric color", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/folders/f1")
          .set({ id: "f1", name: "Work", color: 0xff0000 }),
      );
    });

    it("allows folder without color (optional)", async () => {
      await assertSucceeds(
        aliceDb().doc("users/alice/folders/f1").set({ id: "f1", name: "Work" }),
      );
    });

    it("rejects folder with numeric id", async () => {
      await assertFails(
        aliceDb().doc("users/alice/folders/f1").set({ id: 1, name: "Work" }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. SCRATCHPAD – SCHEMA VALIDATION ATTACKS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("scratchpad schema validation", () => {
    it("rejects scratchpad with extra fields", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/meta/scratchpad")
          .set({ value: "ok", extra: "bad" }),
      );
    });

    it("rejects scratchpad with numeric value", async () => {
      await assertFails(
        aliceDb().doc("users/alice/meta/scratchpad").set({ value: 42 }),
      );
    });

    it("rejects scratchpad with boolean value", async () => {
      await assertFails(
        aliceDb().doc("users/alice/meta/scratchpad").set({ value: true }),
      );
    });

    it("rejects scratchpad with null value", async () => {
      await assertFails(
        aliceDb().doc("users/alice/meta/scratchpad").set({ value: null }),
      );
    });

    it("rejects scratchpad without value field", async () => {
      await assertFails(
        aliceDb().doc("users/alice/meta/scratchpad").set({ content: "sneaky" }),
      );
    });

    it("rejects scratchpad with value exceeding 200000 chars", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/meta/scratchpad")
          .set({ value: "x".repeat(200001) }),
      );
    });

    it("allows scratchpad with value at exactly 200000 chars", async () => {
      await assertSucceeds(
        aliceDb()
          .doc("users/alice/meta/scratchpad")
          .set({ value: "x".repeat(200000) }),
      );
    });

    it("allows scratchpad with empty value", async () => {
      await assertSucceeds(
        aliceDb().doc("users/alice/meta/scratchpad").set({ value: "" }),
      );
    });

    it("rejects writing to meta/settings (not scratchpad)", async () => {
      await assertFails(
        aliceDb().doc("users/alice/meta/settings").set({ theme: "dark" }),
      );
    });

    it("rejects writing to meta/profile (not scratchpad)", async () => {
      await assertFails(
        aliceDb().doc("users/alice/meta/profile").set({ name: "Alice" }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. UPDATE-SPECIFIC ATTACKS (partial update / field injection)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("update attacks", () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().doc("users/alice/notes/n1").set(VALID_NOTE);
        await ctx.firestore().doc("users/alice/folders/f1").set(VALID_FOLDER);
        await ctx
          .firestore()
          .doc("users/alice/meta/scratchpad")
          .set(VALID_SCRATCHPAD);
      });
    });

    it("rejects update that adds 'isAdmin' to existing note", async () => {
      await assertFails(
        aliceDb().doc("users/alice/notes/n1").update({ isAdmin: true }),
      );
    });

    it("rejects update that adds 'role' to existing note", async () => {
      await assertFails(
        aliceDb().doc("users/alice/notes/n1").update({ role: "superuser" }),
      );
    });

    it("rejects update that changes id to different value", async () => {
      await assertFails(
        aliceDb().doc("users/alice/notes/n1").update({ id: "HACKED" }),
      );
    });

    it("rejects update that changes text type to number", async () => {
      await assertFails(
        aliceDb().doc("users/alice/notes/n1").update({ text: 42 }),
      );
    });

    it("allows valid update to note text", async () => {
      await assertSucceeds(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, text: "updated text" }),
      );
    });

    it("rejects update that adds extra field to folder", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/folders/f1")
          .update({ permissions: "admin" }),
      );
    });

    it("rejects update that adds extra field to scratchpad", async () => {
      await assertFails(
        aliceDb().doc("users/alice/meta/scratchpad").update({ secret: "key" }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. DELETE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("delete operations", () => {
    beforeEach(seed);

    it("owner can delete own note", async () => {
      await assertSucceeds(aliceDb().doc("users/alice/notes/n1").delete());
    });

    it("owner can delete own folder", async () => {
      await assertSucceeds(aliceDb().doc("users/alice/folders/f1").delete());
    });

    it("owner can delete own scratchpad", async () => {
      await assertSucceeds(
        aliceDb().doc("users/alice/meta/scratchpad").delete(),
      );
    });

    it("bob cannot delete alice's note", async () => {
      await assertFails(bobDb().doc("users/alice/notes/n1").delete());
    });

    it("bob cannot delete alice's folder", async () => {
      await assertFails(bobDb().doc("users/alice/folders/f1").delete());
    });

    it("bob cannot delete alice's scratchpad", async () => {
      await assertFails(bobDb().doc("users/alice/meta/scratchpad").delete());
    });

    it("anon cannot delete any resource", async () => {
      await assertFails(anonDb().doc("users/alice/notes/n1").delete());
      await assertFails(anonDb().doc("users/alice/folders/f1").delete());
      await assertFails(anonDb().doc("users/alice/meta/scratchpad").delete());
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. BATCH WRITE / MULTI-DOC ESCALATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("batch write escalation", () => {
    it("bob cannot batch-write to alice's notes", async () => {
      const db = bobDb();
      const batch = db.batch();
      batch.set(db.doc("users/alice/notes/injected"), {
        ...VALID_NOTE,
        id: "injected",
      });
      await assertFails(batch.commit());
    });

    it("bob cannot mix own write + alice write in batch", async () => {
      const db = bobDb();
      const batch = db.batch();
      batch.set(db.doc("users/bob/notes/b1"), {
        ...VALID_NOTE,
        id: "b1",
      });
      batch.set(db.doc("users/alice/notes/injected"), {
        ...VALID_NOTE,
        id: "injected",
      });
      await assertFails(batch.commit());
    });

    it("alice can batch-write multiple valid notes to own path", async () => {
      const db = aliceDb();
      const batch = db.batch();
      batch.set(db.doc("users/alice/notes/a1"), {
        ...VALID_NOTE,
        id: "a1",
      });
      batch.set(db.doc("users/alice/notes/a2"), {
        ...VALID_NOTE,
        id: "a2",
        text: "second",
      });
      await assertSucceeds(batch.commit());
    });

    it("batch fails if ANY note in batch has invalid schema", async () => {
      const db = aliceDb();
      const batch = db.batch();
      batch.set(db.doc("users/alice/notes/ok"), {
        ...VALID_NOTE,
        id: "ok",
      });
      batch.set(db.doc("users/alice/notes/bad"), {
        id: "bad",
        text: 42, // invalid type
        category: "x",
        isFav: false,
        isTrash: false,
        isHidden: false,
      });
      await assertFails(batch.commit());
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. COLLECTION LISTING / QUERYING
  // ═══════════════════════════════════════════════════════════════════════════

  describe("collection querying", () => {
    beforeEach(seed);

    it("alice can list own notes", async () => {
      await assertSucceeds(aliceDb().collection("users/alice/notes").get());
    });

    it("alice can list own folders", async () => {
      await assertSucceeds(aliceDb().collection("users/alice/folders").get());
    });

    it("bob cannot query alice's notes", async () => {
      await assertFails(bobDb().collection("users/alice/notes").get());
    });

    it("bob cannot query alice's folders", async () => {
      await assertFails(bobDb().collection("users/alice/folders").get());
    });

    it("anon cannot query any notes", async () => {
      await assertFails(anonDb().collection("users/alice/notes").get());
    });

    it("cannot use collection group query on notes", async () => {
      await assertFails(anonDb().collectionGroup("notes").get());
    });

    it("cannot use collection group query on folders", async () => {
      await assertFails(anonDb().collectionGroup("folders").get());
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. EDGE CASES & MISC ATTACKS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("edge cases", () => {
    it("rejects note with XSS payload in text (schema allows it but bounded)", async () => {
      // XSS payloads are strings so they pass schema checks –
      // this test verifies the size limit still applies
      const xss = '<script>alert("xss")</script>'.repeat(2000);
      await assertSucceeds(
        aliceDb()
          .doc("users/alice/notes/xss1")
          .set({ ...VALID_NOTE, id: "xss1", text: xss.slice(0, 50000) }),
      );
      await assertFails(
        aliceDb()
          .doc("users/alice/notes/xss2")
          .set({ ...VALID_NOTE, id: "xss2", text: xss.repeat(10) }),
      );
    });

    it("rejects note with very long category (injection attempt)", async () => {
      await assertFails(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, category: "a".repeat(200) }),
      );
    });

    it("allows note toggling isFav", async () => {
      await assertSucceeds(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, isFav: true }),
      );
    });

    it("allows note toggling isTrash", async () => {
      await assertSucceeds(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, isTrash: true }),
      );
    });

    it("allows note toggling isHidden", async () => {
      await assertSucceeds(
        aliceDb()
          .doc("users/alice/notes/n1")
          .set({ ...VALID_NOTE, isHidden: true }),
      );
    });

    it("rejects writing to completely unrelated path", async () => {
      await assertFails(aliceDb().doc("system/config").set({ flag: true }));
    });

    it("rejects authenticated user writing to another user's root", async () => {
      await assertFails(aliceDb().doc("users/bob").set({ compromised: true }));
    });
  });
});
