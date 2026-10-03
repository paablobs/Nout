import type { Folder, Note } from "../repositories/types";

export interface MigrationLedger {
  notes: Record<string, string>;
  folders: Record<string, string>;
}

export type MigrationLedgerStore = Record<string, MigrationLedger>;

const FNV_OFFSET_BASIS = 14695981039346656037n;
const FNV_PRIME = 1099511628211n;
const UINT64_MASK = 0xffffffffffffffffn;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const digest = (value: string): string => {
  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = (hash * FNV_PRIME) & UINT64_MASK;
  }
  return hash.toString(16).padStart(16, "0");
};

export function fingerprintNote(note: Note): string {
  return digest(
    JSON.stringify([
      note.id,
      note.text,
      note.isFav,
      note.isTrash,
      note.isHidden,
      note.createdAt,
      note.updatedAt,
      note.folderId ?? null,
      note.trashedAt ?? null,
    ]),
  );
}

export function fingerprintFolder(folder: Folder): string {
  return digest(JSON.stringify([folder.id, folder.name, folder.color ?? null]));
}

const parseFingerprints = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) return {};
  const result: Record<string, string> = {};
  for (const [id, fingerprint] of Object.entries(value)) {
    if (typeof fingerprint === "string") {
      result[id] = fingerprint;
    }
  }
  return result;
};

export function parseMigrationLedger(raw: string | null): MigrationLedgerStore {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return {};
    const result: MigrationLedgerStore = {};
    for (const [accountId, value] of Object.entries(parsed)) {
      if (!isRecord(value)) continue;
      result[accountId] = {
        notes: parseFingerprints(value.notes),
        folders: parseFingerprints(value.folders),
      };
    }
    return result;
  } catch {
    return {};
  }
}

export function getAccountMigrationLedger(
  store: MigrationLedgerStore,
  accountId: string,
): MigrationLedger {
  return (
    store[accountId] ?? {
      notes: {},
      folders: {},
    }
  );
}

export function recordMigrationLedger(
  store: MigrationLedgerStore,
  accountId: string,
  notes: Record<string, Note>,
  folders: Folder[],
): MigrationLedgerStore {
  const noteFingerprints: Record<string, string> = {};
  for (const note of Object.values(notes)) {
    noteFingerprints[note.id] = fingerprintNote(note);
  }

  const folderFingerprints: Record<string, string> = {};
  for (const folder of folders) {
    folderFingerprints[folder.id] = fingerprintFolder(folder);
  }

  return {
    ...store,
    [accountId]: {
      notes: noteFingerprints,
      folders: folderFingerprints,
    },
  };
}
