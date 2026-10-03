import { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { useSession } from "../contexts/SessionContext";
import { useReportError } from "../contexts/ErrorContext";
import { db } from "../config/firebase";
import { useLocalStorage } from "./useLocalStorage";
import { selectedView } from "../utils/selectedView";
import { storageKeys } from "../utils/storageKeys";
import {
  getLocalStorageItem,
  setLocalStorageItem,
} from "../utils/localStorageHelper";
import randomColor from "../utils/randomColor";
import type { Note, Folder } from "../repositories/types";
import { createCloudNotesRepository } from "../repositories/cloud/CloudNotesRepository";
import { createCloudFoldersRepository } from "../repositories/cloud/CloudFoldersRepository";
import { createLocalNotesRepository } from "../repositories/local/LocalNotesRepository";
import { createLocalFoldersRepository } from "../repositories/local/LocalFoldersRepository";
import { FIRESTORE_BATCH_LIMIT } from "../repositories/cloud/firestoreBatch";
import { normalizeNote, backfillTrashedAt } from "../utils/noteSchema";
import {
  getAccountMigrationLedger,
  parseMigrationLedger,
  recordMigrationLedger,
} from "../utils/localMigrationLedger";
import { excludeNoteIds, planMigration } from "../utils/noteMigration";
import { selectPurgeIds } from "../utils/noteLifecycle";
import { NoteMutationQueue } from "../utils/noteMutationQueue";
import {
  createNote,
  planFolderDeletion,
  withFolderMoved,
  withRestored,
  withTrashed,
  withToggledFavorite,
  withToggledHidden,
  withUpdatedText,
} from "../utils/noteTransforms";

const NOTE_SAVE_DEBOUNCE_MS = 400;
const MIGRATION_RETRY_MS = 1000;
const folderMutationKey = (accountId: string, folderId: string) =>
  `${accountId}\0${folderId}`;

export type { Note, Folder };

const useNotes = () => {
  const { user, loading: sessionLoading } = useSession();
  const reportError = useReportError();

  const [localNotes] = useLocalStorage<Record<string, Note>>(
    storageKeys.NOTES,
    {},
  );
  const [localFolders] = useLocalStorage<Folder[]>(storageKeys.FOLDERS, []);

  const [cloudNotes, setCloudNotes] = useState<Record<string, Note>>({});
  const [cloudFolders, setCloudFolders] = useState<Folder[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);

  const repos = useMemo(() => {
    if (user && db) {
      return {
        cloud: true as const,
        notes: createCloudNotesRepository(db, user.uid),
        folders: createCloudFoldersRepository(db, user.uid),
      };
    }
    return {
      cloud: false as const,
      notes: createLocalNotesRepository(),
      folders: createLocalFoldersRepository(),
    };
  }, [user]);

  const noteQueue = useMemo(
    () =>
      new NoteMutationQueue((note) => repos.notes.upsert(note), {
        debounceMs: repos.cloud ? NOTE_SAVE_DEBOUNCE_MS : 0,
        retainLatestUntilObserved: repos.cloud,
        onError: (error) => {
          console.error("Failed to save note", error);
          reportError("Could not save the note");
        },
      }),
    [repos, reportError],
  );
  const noteQueueRef = useRef(noteQueue);
  noteQueueRef.current = noteQueue;
  const permanentDeleteIdsRef = useRef(new Map<string, Set<string>>());
  const migrationSessionsRef = useRef(new Map<string, object>());
  const folderOperationRef = useRef(Promise.resolve());
  const folderMutationVersionsRef = useRef(new Map<string, number>());
  const folderMutationSuccessVersionsRef = useRef(new Map<string, number>());

  const markFolderMutation = (folderId: string) => {
    const key = folderMutationKey(user?.uid ?? "local", folderId);
    const current = folderMutationVersionsRef.current.get(key) ?? 0;
    const next = current + 1;
    folderMutationVersionsRef.current.set(key, next);
    return { key, version: next };
  };

  const enqueueFolderMutation = (
    folderId: string,
    operation: () => Promise<void>,
  ) => {
    const { key, version } = markFolderMutation(folderId);
    return enqueueFolderOperation(async () => {
      await operation();
      folderMutationSuccessVersionsRef.current.set(key, version);
    });
  };

  const enqueueFolderOperation = (operation: () => Promise<void>) => {
    const previous = folderOperationRef.current;
    const next = previous.then(operation, operation);
    folderOperationRef.current = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };

  const clearSafePermanentDeleteIds = async (
    accountKey: string,
    ids: Set<string>,
  ) => {
    if (ids.size === 0) return;
    const localNotes = await createLocalNotesRepository().getAll();
    ids.forEach((id) => {
      if (!localNotes[id]) ids.delete(id);
    });
    if (ids.size === 0) {
      permanentDeleteIdsRef.current.delete(accountKey);
    }
  };

  useEffect(() => {
    return () => {
      void noteQueue.flushAndWait();
    };
  }, [noteQueue]);

  useEffect(() => {
    const run = async () => {
      try {
        const repo = createLocalNotesRepository();
        const now = Date.now();
        const stored = await repo.getAll();
        const backfilled = backfillTrashedAt(stored, now);
        const purgeIds = selectPurgeIds(backfilled, now);
        const changed = Object.values(backfilled).filter(
          (note) => stored[note.id] !== note,
        );
        if (changed.length > 0) {
          await repo.upsertBatch(changed);
        }
        if (purgeIds.length > 0) {
          await repo.removeBatch(purgeIds);
        }
      } catch (error) {
        console.warn("Failed to clean up local notes", error);
      }
    };
    void run();
  }, []);

  useEffect(() => {
    if (!user || !db) {
      setCloudNotes({});
      setCloudFolders([]);
      setCloudLoading(false);
      return;
    }

    const cloudDb = db;
    const userId = user.uid;
    const permanentDeleteIds =
      permanentDeleteIdsRef.current.get(userId) ?? new Set<string>();
    permanentDeleteIdsRef.current.set(userId, permanentDeleteIds);
    const notesRepo = createCloudNotesRepository(cloudDb, userId);
    const foldersRepo = createCloudFoldersRepository(cloudDb, userId);

    const session = {
      receivedNotes: false,
      receivedFolders: false,
      serverNotes: false,
      serverFolders: false,
      migrated: false,
      purged: false,
      migrationPromise: null as Promise<void> | null,
      migrationRetryTimer: null as ReturnType<typeof setTimeout> | null,
      migrationErrorReported: false,
      cancelled: false,
    };
    migrationSessionsRef.current.set(userId, session);
    let latestCloudNotes: Record<string, Note> = {};
    let latestCloudFolders: Folder[] = [];

    const finishLoading = () => {
      if (
        !session.cancelled &&
        session.receivedNotes &&
        session.receivedFolders
      ) {
        setCloudLoading(false);
      }
    };

    const scheduleMigrationRetry = () => {
      if (session.cancelled || session.migrationRetryTimer !== null) return;
      session.migrationRetryTimer = setTimeout(() => {
        session.migrationRetryTimer = null;
        maybeRunMigrationAndPurge();
      }, MIGRATION_RETRY_MS);
    };

    const runMigrationAndPurge = async () => {
      if (!session.migrated) {
        try {
          const folderSuccessBaseline = new Map(
            folderMutationSuccessVersionsRef.current,
          );
          // Finish edits that were queued while the initial cloud snapshots
          // arrived before calculating the migration plan.
          await noteQueue.flushAndWait();
          if (session.cancelled) return;

          const [localNotesData, localFoldersData] = await Promise.all([
            createLocalNotesRepository().getAll(),
            createLocalFoldersRepository().getAll(),
          ]);
          const migrationLedger = getAccountMigrationLedger(
            parseMigrationLedger(
              getLocalStorageItem(storageKeys.MIGRATION_LEDGER),
            ),
            userId,
          );
          const plan = planMigration({
            localNotes: localNotesData,
            localFolders: localFoldersData,
            cloudNotes: latestCloudNotes,
            cloudFolders: latestCloudFolders,
            now: Date.now(),
            migrationLedger,
          });

          // An edit can arrive while localStorage is being read. Flush again
          // before starting migration writes.
          await noteQueue.flushAndWait();
          if (session.cancelled) return;

          if (plan.foldersToWrite.length > 0) {
            await enqueueFolderOperation(async () => {
              const foldersToWrite = plan.foldersToWrite.filter((folder) => {
                const key = folderMutationKey(userId, folder.id);
                const plannedVersion = folderSuccessBaseline.get(key) ?? 0;
                const mutationSucceededDuringMigration =
                  (folderMutationSuccessVersionsRef.current.get(key) ?? 0) >
                  plannedVersion;
                return !mutationSucceededDuringMigration;
              });
              if (foldersToWrite.length > 0) {
                await foldersRepo.upsertBatch(foldersToWrite);
              }
            });
          }

          // Read the queue after folder writes too: folder batches can be
          // large enough for a note edit to arrive while they commit.
          await noteQueue.flushAndWait();
          if (session.cancelled) return;
          const latestQueuedNotes = noteQueue.getLatestNotes();
          const notesToWrite = excludeNoteIds(
            plan.notesToWrite,
            permanentDeleteIds,
          ).map((note) => latestQueuedNotes[note.id] ?? note);
          if (notesToWrite.length > 0) {
            await notesRepo.upsertBatch(notesToWrite);

            // A permanent delete can race with the migration batch. Delete
            // any planned IDs marked during that batch after it commits.
            const migratedNoteIds = new Set(
              notesToWrite.map((note) => note.id),
            );
            const racedDeleteIds = [...permanentDeleteIds].filter((id) =>
              migratedNoteIds.has(id),
            );
            if (racedDeleteIds.length > 0) {
              await notesRepo.removeBatch(racedDeleteIds);
            }
          }

          if (session.cancelled) return;
          const localNotesForLedger = { ...localNotesData };
          Object.keys(localNotesForLedger).forEach((id) => {
            const latest = latestQueuedNotes[id];
            if (latest) localNotesForLedger[id] = latest;
          });
          const updatedLedger = recordMigrationLedger(
            parseMigrationLedger(
              getLocalStorageItem(storageKeys.MIGRATION_LEDGER),
            ),
            userId,
            localNotesForLedger,
            localFoldersData,
          );
          setLocalStorageItem(storageKeys.MIGRATION_LEDGER, updatedLedger);
          // Mark this only after every migration batch has committed. A
          // partial failure must be eligible for a later retry.
          session.migrated = true;
        } catch (error) {
          console.error("Failed to migrate local data to cloud", error);
          if (!session.cancelled) {
            if (!session.migrationErrorReported) {
              session.migrationErrorReported = true;
              reportError("Could not copy your local notes to the cloud");
            }
            scheduleMigrationRetry();
            finishLoading();
          }
          return;
        }
      }

      if (session.cancelled) return;

      if (!session.purged) {
        try {
          const purgeIds = selectPurgeIds(latestCloudNotes, Date.now());
          if (purgeIds.length > 0) {
            await notesRepo.removeBatch(purgeIds);
          }
          if (session.cancelled) return;
          session.purged = true;
        } catch (error) {
          console.error("Failed to purge old trash", error);
          scheduleMigrationRetry();
        }
      }

      finishLoading();
    };

    const maybeRunMigrationAndPurge = () => {
      if (
        session.cancelled ||
        !session.serverNotes ||
        !session.serverFolders ||
        session.migrationPromise
      ) {
        return;
      }
      if (session.migrated && session.purged) {
        finishLoading();
        return;
      }
      const promise = runMigrationAndPurge();
      session.migrationPromise = promise;
      void promise.then(
        () => {
          if (session.migrationPromise === promise) {
            session.migrationPromise = null;
          }
          if (migrationSessionsRef.current.get(userId) === session) {
            migrationSessionsRef.current.delete(userId);
            void clearSafePermanentDeleteIds(userId, permanentDeleteIds);
          }
        },
        () => {
          if (session.migrationPromise === promise) {
            session.migrationPromise = null;
          }
          if (migrationSessionsRef.current.get(userId) === session) {
            migrationSessionsRef.current.delete(userId);
            void clearSafePermanentDeleteIds(userId, permanentDeleteIds);
          }
        },
      );
    };

    setCloudLoading(true);

    const unsubNotes = onSnapshot(
      collection(cloudDb, "users", userId, "notes"),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (session.cancelled) return;
        const record: Record<string, Note> = {};
        snapshot.docs.forEach((item) => {
          record[item.id] = normalizeNote(item.data());
        });
        latestCloudNotes = record;
        setCloudNotes(record);
        noteQueue.observe(record);
        session.receivedNotes = true;
        finishLoading();
        if (!snapshot.metadata.fromCache) {
          session.serverNotes = true;
          maybeRunMigrationAndPurge();
        }
      },
      (error) => {
        if (session.cancelled) return;
        console.error("Failed to listen to cloud notes", error);
        setCloudLoading(false);
        reportError("Lost connection to your cloud notes");
      },
    );

    const unsubFolders = onSnapshot(
      collection(cloudDb, "users", userId, "folders"),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (session.cancelled) return;
        const folders = snapshot.docs.map((item) => {
          const data = item.data() as Partial<Folder>;
          return {
            id: typeof data.id === "string" ? data.id : item.id,
            name: typeof data.name === "string" ? data.name : "",
            ...(typeof data.color === "string" ? { color: data.color } : {}),
          };
        });
        latestCloudFolders = folders;
        setCloudFolders(folders);
        session.receivedFolders = true;
        finishLoading();
        if (!snapshot.metadata.fromCache) {
          session.serverFolders = true;
          maybeRunMigrationAndPurge();
        }
      },
      (error) => {
        if (session.cancelled) return;
        console.error("Failed to listen to cloud folders", error);
        setCloudLoading(false);
        reportError("Lost connection to your cloud folders");
      },
    );

    return () => {
      session.cancelled = true;
      if (migrationSessionsRef.current.get(userId) === session) {
        if (!session.migrationPromise) {
          migrationSessionsRef.current.delete(userId);
          void clearSafePermanentDeleteIds(userId, permanentDeleteIds);
        }
      }
      if (session.migrationRetryTimer !== null) {
        clearTimeout(session.migrationRetryTimer);
      }
      unsubNotes();
      unsubFolders();
    };
  }, [noteQueue, reportError, user]);

  const notes = user ? cloudNotes : localNotes;
  const folders = user ? cloudFolders : localFolders;

  const persistNote = (note: Note) => {
    noteQueueRef.current.enqueue(note);
  };

  const persistNotes = (notesToUpdate: Note[]) => {
    notesToUpdate.forEach((note) => noteQueueRef.current.enqueue(note));
  };

  const scheduleNoteSave = (note: Note) => {
    noteQueueRef.current.schedule(note);
  };

  const addNote = (currentView: string, selectedFolderId?: string) => {
    const options: { isFav?: boolean; folderId?: string } = {};
    if (currentView === selectedView.FAVORITES) {
      options.isFav = true;
    }
    if (currentView === selectedView.FOLDERS && selectedFolderId) {
      options.folderId = selectedFolderId;
    }
    const note = createNote(Date.now(), options);
    persistNote(note);
    return note.id;
  };

  const addFolder = (folderName: string) => {
    const name = folderName.trim();
    if (!name) return;
    const folder: Folder = {
      id: crypto.randomUUID(),
      name,
      color: randomColor(),
    };
    void enqueueFolderMutation(folder.id, () =>
      repos.folders.upsert(folder),
    ).catch((error) => {
      console.error("Failed to create folder", error);
      reportError("Could not create the folder");
    });
  };

  const renameFolder = (folderId: string, folderName: string) => {
    const name = folderName.trim();
    const folder = folders.find((item) => item.id === folderId);
    if (!folder || !name) return;
    void enqueueFolderMutation(folderId, () =>
      repos.folders.upsert({ ...folder, name }),
    ).catch((error) => {
      console.error("Failed to rename folder", error);
      reportError("Could not rename the folder");
    });
  };

  const deleteFolder = (folderId: string) => {
    const notesForMutation = {
      ...notes,
      ...noteQueueRef.current.getLatestNotes(),
    };
    const plan = planFolderDeletion(notesForMutation, folderId, Date.now());
    noteQueueRef.current.enqueueAtomic(
      plan.trashedNotes,
      async () => {
        await enqueueFolderMutation(folderId, () =>
          repos.folders.removeWithNotes(folderId, plan.trashedNotes),
        );
      },
      (error) => {
        console.error("Failed to delete folder", error);
        reportError("Could not delete the folder");
      },
      {
        rollbackOnFailure:
          !repos.cloud || plan.trashedNotes.length + 1 <= FIRESTORE_BATCH_LIMIT,
      },
    );
  };

  const getNoteForMutation = (id: string) =>
    noteQueueRef.current.getLatest(id) ?? notes[id];

  const addFavorite = (id: string) => {
    const note = getNoteForMutation(id);
    if (note) {
      persistNote(withToggledFavorite(note));
    }
  };

  const moveNoteToFolder = (noteId: string, folderId: string | null) => {
    const note = getNoteForMutation(noteId);
    if (note) {
      persistNote(withFolderMoved(note, folderId));
    }
  };

  const deleteNotes = (ids: string[], permanent = false) => {
    if (ids.length === 0) return;
    if (permanent) {
      const accountKey = user?.uid ?? "local";
      const permanentDeleteIds =
        permanentDeleteIdsRef.current.get(accountKey) ?? new Set<string>();
      permanentDeleteIdsRef.current.set(accountKey, permanentDeleteIds);
      ids.forEach((id) => permanentDeleteIds.add(id));
      let cloudDeleteSucceeded = false;
      noteQueueRef.current.enqueueOperation(
        ids,
        async () => {
          await repos.notes.removeBatch(ids);
          cloudDeleteSucceeded = true;
          if (repos.cloud) {
            await createLocalNotesRepository().removeBatch(ids);
          }
          if (!migrationSessionsRef.current.has(accountKey)) {
            ids.forEach((id) => permanentDeleteIds.delete(id));
          }
        },
        (error) => {
          console.error("Failed to permanently delete notes", error);
          if (!cloudDeleteSucceeded) {
            ids.forEach((id) => permanentDeleteIds.delete(id));
            if (permanentDeleteIds.size === 0) {
              permanentDeleteIdsRef.current.delete(accountKey);
            }
          }
          reportError("Could not delete the notes");
        },
      );
      return;
    }
    const now = Date.now();
    const trashedNotes = ids
      .map((id) => getNoteForMutation(id))
      .filter((note): note is Note => Boolean(note))
      .map((note) => withTrashed(note, now));
    persistNotes(trashedNotes);
  };

  const restoreNote = (id: string) => {
    const note = getNoteForMutation(id);
    if (note && note.isTrash) {
      persistNote(withRestored(note));
    }
  };

  const getNoteById = (id: string) => {
    return notes[id] || null;
  };

  const updateNoteText = (id: string, text: string) => {
    const note = getNoteForMutation(id);
    if (note) {
      scheduleNoteSave(withUpdatedText(note, text, Date.now()));
    }
  };

  const hideNote = (id: string) => {
    const note = getNoteForMutation(id);
    if (note) {
      persistNote(withToggledHidden(note));
    }
  };

  return {
    loading: sessionLoading || (Boolean(user) && cloudLoading),
    notes,
    folders,
    addNote,
    addFolder,
    renameFolder,
    deleteFolder,
    addFavorite,
    moveNoteToFolder,
    deleteNotes,
    restoreNote,
    getNoteById,
    updateNoteText,
    hideNote,
  };
};

export default useNotes;
