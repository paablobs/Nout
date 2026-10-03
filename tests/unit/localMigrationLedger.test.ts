import { describe, expect, it } from "vitest";
import type { Folder, Note } from "../../src/repositories/types";
import {
  fingerprintFolder,
  fingerprintNote,
  getAccountMigrationLedger,
  parseMigrationLedger,
  recordMigrationLedger,
} from "../../src/utils/localMigrationLedger";

const note: Note = {
  id: "n1",
  text: "A long note body that must not be duplicated in the ledger",
  isFav: false,
  isTrash: false,
  isHidden: false,
  createdAt: 1,
  updatedAt: 2,
};

const folder: Folder = { id: "f1", name: "Work", color: "#fff" };

describe("local migration ledger", () => {
  it("stores compact digests rather than note text", () => {
    const ledger = recordMigrationLedger({}, "account-a", { n1: note }, [
      folder,
    ]);

    expect(ledger["account-a"]?.notes.n1).toBe(fingerprintNote(note));
    expect(ledger["account-a"]?.folders.f1).toBe(fingerprintFolder(folder));
    expect(ledger["account-a"]?.notes.n1).not.toContain(note.text);
    expect(ledger["account-a"]?.notes.n1).toHaveLength(16);
  });

  it("keeps account ledgers isolated and tolerates malformed storage", () => {
    const stored = recordMigrationLedger({}, "account-a", { n1: note }, []);
    const parsed = parseMigrationLedger(JSON.stringify(stored));

    expect(getAccountMigrationLedger(parsed, "account-a").notes.n1).toBe(
      fingerprintNote(note),
    );
    expect(getAccountMigrationLedger(parsed, "account-b")).toEqual({
      notes: {},
      folders: {},
    });
    expect(parseMigrationLedger("not-json")).toEqual({});
  });

  it("replaces an account snapshot while preserving other accounts", () => {
    const first = recordMigrationLedger({}, "account-a", { n1: note }, []);
    const second = recordMigrationLedger(first, "account-b", {}, [folder]);
    const updated = recordMigrationLedger(second, "account-a", {}, []);

    expect(updated["account-a"]).toEqual({ notes: {}, folders: {} });
    expect(updated["account-b"]?.folders.f1).toBe(fingerprintFolder(folder));
  });
});
