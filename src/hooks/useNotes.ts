import { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { useSession } from "../contexts/SessionContext";
import { useReportError } from "../contexts/ErrorContext";
import { db } from "../config/firebase";
import { useLocalStorage } from "./useLocalStorage";
import { selectedView } from "../utils/selectedView";
import { storageKeys } from "../utils/storageKeys";
import randomColor from "../utils/randomColor";
import type { Note, Folder } from "../repositories/types";
import { createCloudNotesRepository } from "../repositories/cloud/CloudNotesRepository";
import { createCloudFoldersRepository } from "../repositories/cloud/CloudFoldersRepository";
import { createLocalNotesRepository } from "../repositories/local/LocalNotesRepository";
import { createLocalFoldersRepository } from "../repositories/local/LocalFoldersRepository";
import { normalizeNote, backfillTrashedAt } from "../utils/noteSchema";
import { planMigration } from "../utils/noteMigration";
import { selectPurgeIds } from "../utils/noteLifecycle";
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

  const noteSaveTimersRef = useRef<Record<string, number>>({});
  const pendingNoteSavesRef = useRef<Record<string, Note>>({});

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
    const notesRepo = createCloudNotesRepository(cloudDb, userId);
    const foldersRepo = createCloudFoldersRepository(cloudDb, userId);

    const flushPendingNoteSaves = () => {
      const pending = pendingNoteSavesRef.current;
      pendingNoteSavesRef.current = {};
      const notes = Object.values(pending);
      if (notes.length === 0) return;
      void notesRepo.upsertBatch(notes).catch((error) => {
        console.error("Failed to flush pending note saves", error);
        reportError("Could not save your latest changes to the cloud");
      });
    };

    Object.values(noteSaveTimersRef.current).forEach((timer) => {
      window.clearTimeout(timer);
    });
    noteSaveTimersRef.current = {};
    flushPendingNoteSaves();

    const session = {
      serverNotes: false,
      serverFolders: false,
      migrated: false,
      purged: false,
    };
    let latestCloudNotes: Record<string, Note> = {};
    let latestCloudFolders: Folder[] = [];

    const runMigrationAndPurge = async () => {
      if (!session.migrated) {
        session.migrated = true;
        try {
          const [localNotesData, localFoldersData] = await Promise.all([
            createLocalNotesRepository().getAll(),
            createLocalFoldersRepository().getAll(),
          ]);
          const plan = planMigration({
            localNotes: localNotesData,
            localFolders: localFoldersData,
            cloudNotes: latestCloudNotes,
            cloudFolders: latestCloudFolders,
            now: Date.now(),
          });
          if (plan.foldersToWrite.length > 0) {
            await foldersRepo.upsertBatch(plan.foldersToWrite);
          }
          if (plan.notesToWrite.length > 0) {
            await notesRepo.upsertBatch(plan.notesToWrite);
          }
        } catch (error) {
          console.error("Failed to migrate local data to cloud", error);
          reportError("Could not copy your local notes to the cloud");
        }
      }

      if (!session.purged) {
        session.purged = true;
        const purgeIds = selectPurgeIds(latestCloudNotes, Date.now());
        if (purgeIds.length > 0) {
          try {
            await notesRepo.removeBatch(purgeIds);
          } catch (error) {
            console.error("Failed to purge old trash", error);
          }
        }
      }
    };

    setCloudLoading(true);

    const unsubNotes = onSnapshot(
      collection(cloudDb, "users", userId, "notes"),
      (snapshot) => {
        const record: Record<string, Note> = {};
        snapshot.docs.forEach((item) => {
          record[item.id] = normalizeNote(item.data());
        });
        latestCloudNotes = record;
        setCloudNotes(record);
        setCloudLoading(false);
        if (!snapshot.metadata.fromCache && !session.serverNotes) {
          session.serverNotes = true;
          if (session.serverFolders) {
            void runMigrationAndPurge();
          }
        }
      },
      (error) => {
        console.error("Failed to listen to cloud notes", error);
        setCloudLoading(false);
        reportError("Lost connection to your cloud notes");
      },
    );

    const unsubFolders = onSnapshot(
      collection(cloudDb, "users", userId, "folders"),
      (snapshot) => {
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
        setCloudLoading(false);
        if (!snapshot.metadata.fromCache && !session.serverFolders) {
          session.serverFolders = true;
          if (session.serverNotes) {
            void runMigrationAndPurge();
          }
        }
      },
      (error) => {
        console.error("Failed to listen to cloud folders", error);
        setCloudLoading(false);
        reportError("Lost connection to your cloud folders");
      },
    );

    return () => {
      unsubNotes();
      unsubFolders();
      Object.values(noteSaveTimersRef.current).forEach((timer) => {
        window.clearTimeout(timer);
      });
      noteSaveTimersRef.current = {};
      flushPendingNoteSaves();
    };
  }, [user, reportError]);

  const notes = user ? cloudNotes : localNotes;
  const folders = user ? cloudFolders : localFolders;

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

  const persistNote = (note: Note) => {
    void repos.notes.upsert(note).catch((error) => {
      console.error("Failed to save note", error);
      reportError("Could not save the note");
    });
  };

  const persistNotes = (notesToUpdate: Note[]) => {
    if (notesToUpdate.length === 0) return;
    void repos.notes.upsertBatch(notesToUpdate).catch((error) => {
      console.error("Failed to save notes", error);
      reportError("Could not save the notes");
    });
  };

  const scheduleNoteSave = (note: Note) => {
    if (!repos.cloud) {
      persistNote(note);
      return;
    }
    pendingNoteSavesRef.current[note.id] = note;
    const existingTimer = noteSaveTimersRef.current[note.id];
    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
    }
    noteSaveTimersRef.current[note.id] = window.setTimeout(() => {
      delete noteSaveTimersRef.current[note.id];
      const pending = pendingNoteSavesRef.current[note.id];
      if (!pending) return;
      delete pendingNoteSavesRef.current[note.id];
      persistNote(pending);
    }, NOTE_SAVE_DEBOUNCE_MS);
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
    void repos.folders.upsert(folder).catch((error) => {
      console.error("Failed to create folder", error);
      reportError("Could not create the folder");
    });
  };

  const renameFolder = (folderId: string, folderName: string) => {
    const name = folderName.trim();
    const folder = folders.find((item) => item.id === folderId);
    if (!folder || !name) return;
    void repos.folders.upsert({ ...folder, name }).catch((error) => {
      console.error("Failed to rename folder", error);
      reportError("Could not rename the folder");
    });
  };

  const deleteFolder = (folderId: string) => {
    const plan = planFolderDeletion(notes, folderId, Date.now());
    void (async () => {
      try {
        await repos.folders.remove(folderId);
        await repos.notes.upsertBatch(plan.trashedNotes);
      } catch (error) {
        console.error("Failed to delete folder", error);
        reportError("Could not delete the folder");
      }
    })();
  };

  const addFavorite = (id: string) => {
    const note = notes[id];
    if (note) {
      persistNote(withToggledFavorite(note));
    }
  };

  const moveNoteToFolder = (noteId: string, folderId: string | null) => {
    const note = notes[noteId];
    if (note) {
      persistNote(withFolderMoved(note, folderId));
    }
  };

  const deleteNotes = (ids: string[], permanent = false) => {
    if (ids.length === 0) return;
    if (permanent) {
      void repos.notes.removeBatch(ids).catch((error) => {
        console.error("Failed to permanently delete notes", error);
        reportError("Could not delete the notes");
      });
      return;
    }
    const now = Date.now();
    const trashedNotes = ids
      .map((id) => notes[id])
      .filter((note): note is Note => Boolean(note))
      .map((note) => withTrashed(note, now));
    persistNotes(trashedNotes);
  };

  const restoreNote = (id: string) => {
    const note = notes[id];
    if (note && note.isTrash) {
      persistNote(withRestored(note));
    }
  };

  const getNoteById = (id: string) => {
    return notes[id] || null;
  };

  const updateNoteText = (id: string, text: string) => {
    const note = notes[id];
    if (note) {
      scheduleNoteSave(withUpdatedText(note, text, Date.now()));
    }
  };

  const hideNote = (id: string) => {
    const note = notes[id];
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
