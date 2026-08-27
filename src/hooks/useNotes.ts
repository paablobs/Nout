import { selectedView } from "../utils/selectedView";
import { storageKeys } from "../utils/storageKeys";
import { useLocalStorage } from "./useLocalStorage";
import { v4 as uuidv4 } from "uuid";
import randomColor from "../utils/randomColor";
import { DEFAULT_CATEGORY } from "../utils/constants";
import { useSession } from "../contexts/SessionContext";
import { db } from "../config/firebase";
import { useEffect, useRef, useState } from "react";
import type { Note, Folder } from "../repositories/types";
import { createCloudNotesRepository } from "../repositories/cloud/CloudNotesRepository";
import { createCloudFoldersRepository } from "../repositories/cloud/CloudFoldersRepository";
import { getDocs, collection, type Firestore } from "firebase/firestore";

const NOTE_SAVE_DEBOUNCE_MS = 400;

export type { Note, Folder };

const useNotes = () => {
  const { user, loading: sessionLoading } = useSession();

  const [localFolders, setLocalFolders] = useLocalStorage<Folder[]>(
    storageKeys.FOLDERS,
    [],
  );
  const [localNotes, setLocalNotes] = useLocalStorage<Record<string, Note>>(
    storageKeys.NOTES,
    {},
  );

  const [cloudFolders, setCloudFolders] = useState<Folder[]>([]);
  const [cloudNotes, setCloudNotes] = useState<Record<string, Note>>({});
  const [loading, setLoading] = useState(false);
  const noteSaveTimersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    Object.values(noteSaveTimersRef.current).forEach((timer) => {
      window.clearTimeout(timer);
    });
    noteSaveTimersRef.current = {};
    setCloudFolders([]);
    setCloudNotes({});

    if (!user || !db) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const cloudDb = db;
    const userId = user.uid;

    void (async () => {
      const notesRepo = createCloudNotesRepository(cloudDb, userId);
      const foldersRepo = createCloudFoldersRepository(cloudDb, userId);

      setLoading(true);
      try {
        if (controller.signal.aborted) return;

        const [cloudFoldersData, cloudNotesData] = await Promise.all([
          foldersRepo.getAll(),
          notesRepo.getAll(),
        ]);

        if (controller.signal.aborted) return;

        const didMigrate = await seedLocalDataToCloud(
          cloudDb,
          userId,
          localFolders,
          localNotes,
        );

        if (controller.signal.aborted) return;

        if (didMigrate) {
          const [migratedFolders, migratedNotes] = await Promise.all([
            foldersRepo.getAll(),
            notesRepo.getAll(),
          ]);
          if (controller.signal.aborted) return;
          setCloudFolders(migratedFolders);
          setCloudNotes(migratedNotes);
          return;
        }

        setCloudFolders(cloudFoldersData);
        setCloudNotes(cloudNotesData);
      } catch (error) {
        console.error("Failed to load cloud notes", error);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [user]);

  const folders = user ? cloudFolders : localFolders;
  const notes = user ? cloudNotes : localNotes;

  const upsertCloudNote = async (note: Note) => {
    if (!user || !db) return;
    const repo = createCloudNotesRepository(db, user.uid);
    await repo.upsert(note);
  };

  const upsertCloudFolder = async (folder: Folder) => {
    if (!user || !db) return;
    const repo = createCloudFoldersRepository(db, user.uid);
    await repo.upsert(folder);
  };

  const scheduleCloudNoteSave = (note: Note) => {
    if (!user || !db) return;

    const existingTimer = noteSaveTimersRef.current[note.id];
    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
    }

    noteSaveTimersRef.current[note.id] = window.setTimeout(() => {
      delete noteSaveTimersRef.current[note.id];
      void upsertCloudNote(note).catch((error) => {
        console.error("Failed to update note", error);
      });
    }, NOTE_SAVE_DEBOUNCE_MS);
  };

  const addNote = (currentView: string, selectedFolderId?: string) => {
    let category = DEFAULT_CATEGORY;
    if (currentView === selectedView.FOLDERS && selectedFolderId) {
      const folder = folders.find((f) => f.id === selectedFolderId);
      if (folder) category = folder.name;
    }
    const newNote: Note = {
      id: uuidv4(),
      text: "",
      category,
      isFav: currentView === selectedView.FAVORITES,
      isTrash: false,
      isHidden: false,
      ...(currentView === selectedView.FOLDERS && selectedFolderId
        ? { folderId: selectedFolderId }
        : {}),
    };

    if (user) {
      setCloudNotes((prev) => ({ [newNote.id]: newNote, ...prev }));
      void upsertCloudNote(newNote).catch((error) => {
        console.error("Failed to create note", error);
      });
    } else {
      setLocalNotes({ [newNote.id]: newNote, ...notes });
    }

    return newNote.id;
  };

  const addFolder = (folderName: string) => {
    if (folderName.trim()) {
      const newFolder: Folder = {
        id: uuidv4(),
        name: folderName.trim(),
        color: randomColor(),
      };

      if (user) {
        setCloudFolders((prev) => [newFolder, ...prev]);
        void upsertCloudFolder(newFolder).catch((error) => {
          console.error("Failed to create folder", error);
        });
      } else {
        setLocalFolders([newFolder, ...folders]);
      }
    }
  };

  const deleteFolder = (id: string) => {
    const updatedNotes = Object.fromEntries(
      Object.entries(notes).map(([noteId, note]) =>
        note.folderId === id
          ? [
              noteId,
              {
                ...note,
                isTrash: true,
                folderId: undefined,
                category: DEFAULT_CATEGORY,
                isHidden: false,
              },
            ]
          : [noteId, note],
      ),
    ) as Record<string, Note>;

    if (user && db) {
      const cloudDb = db;
      const userId = user.uid;
      setCloudFolders((prev) => prev.filter((folder) => folder.id !== id));
      setCloudNotes(updatedNotes);

      const affectedNoteIds = Object.entries(notes).flatMap(([noteId, note]) =>
        note.folderId === id ? [noteId] : [],
      );

      void (async () => {
        try {
          const notesRepo = createCloudNotesRepository(cloudDb, userId);
          const foldersRepo = createCloudFoldersRepository(cloudDb, userId);

          await foldersRepo.remove(id);

          const notesToUpdate = affectedNoteIds
            .map((noteId) => updatedNotes[noteId])
            .filter(Boolean)
            .map((note) => {
              const noteData = { ...note };
              delete noteData.folderId;
              return noteData;
            });

          if (notesToUpdate.length > 0) {
            await notesRepo.upsertBatch(notesToUpdate);
          }
        } catch (error) {
          console.error("Failed to delete folder", error);
        }
      })();
      return;
    }

    setLocalFolders(folders.filter((folder) => folder.id !== id));
    setLocalNotes(updatedNotes);
  };

  const addFavorite = (id: string) => {
    const note = notes[id];
    if (note) {
      const updatedNote = { ...note, isFav: !note.isFav };
      if (user) {
        setCloudNotes((prev) => ({ ...prev, [id]: updatedNote }));
        scheduleCloudNoteSave(updatedNote);
      } else {
        setLocalNotes({ ...notes, [id]: updatedNote });
      }
    }
  };

  const moveNoteToFolder = (noteId: string, folderId: string | null) => {
    const folder = folderId
      ? folders.find((f) => f.id === folderId)
      : undefined;
    const note = notes[noteId];
    if (note) {
      const updatedNote = {
        ...note,
        folderId: folderId ?? undefined,
        category: folder ? folder.name : DEFAULT_CATEGORY,
      };
      if (user) {
        setCloudNotes((prev) => ({ ...prev, [noteId]: updatedNote }));
        const noteData = { ...updatedNote };
        if (noteData.folderId === undefined) {
          delete noteData.folderId;
        }
        scheduleCloudNoteSave(noteData);
      } else {
        setLocalNotes({ ...notes, [noteId]: updatedNote });
      }
    }
  };

  const deleteNotes = (ids: string[], permanent = false) => {
    if (permanent) {
      const updatedNotes = { ...notes };
      ids.forEach((id) => {
        delete updatedNotes[id];
      });

      if (user && db) {
        const cloudDb = db;
        const userId = user.uid;
        setCloudNotes(updatedNotes);
        void (async () => {
          try {
            const notesRepo = createCloudNotesRepository(cloudDb, userId);
            await notesRepo.removeBatch(ids);
          } catch (error) {
            console.error("Failed to permanently delete notes", error);
          }
        })();
      } else {
        setLocalNotes(updatedNotes);
      }
    } else {
      const updatedNotes = { ...notes };
      ids.forEach((id) => {
        if (updatedNotes[id]) {
          updatedNotes[id] = { ...updatedNotes[id], isTrash: true };
        }
      });

      if (user && db) {
        const cloudDb = db;
        const userId = user.uid;
        setCloudNotes(updatedNotes);
        void (async () => {
          try {
            const notesRepo = createCloudNotesRepository(cloudDb, userId);
            const notesToUpdate = ids
              .map((id) => updatedNotes[id])
              .filter(Boolean);
            await notesRepo.upsertBatch(notesToUpdate);
          } catch (error) {
            console.error("Failed to move notes to trash", error);
          }
        })();
      } else {
        setLocalNotes(updatedNotes);
      }
    }
  };

  const restoreNote = (id: string) => {
    const note = notes[id];
    if (note && note.isTrash) {
      const restoredNote = { ...note, isTrash: false, isHidden: false };
      if (user) {
        setCloudNotes((prev) => ({ ...prev, [id]: restoredNote }));
        const noteData = { ...restoredNote };
        if (noteData.folderId === undefined) {
          delete noteData.folderId;
        }
        void upsertCloudNote(noteData).catch((error) => {
          console.error("Failed to restore note", error);
        });
      } else {
        setLocalNotes({ ...notes, [id]: restoredNote });
      }
    }
  };

  const getNoteById = (id: string) => {
    return notes[id] || null;
  };

  const updateNoteText = (id: string, text: string) => {
    const note = notes[id];
    if (note) {
      const updatedNote = { ...note, text };
      if (user) {
        setCloudNotes((prev) => ({ ...prev, [id]: updatedNote }));
        scheduleCloudNoteSave(updatedNote);
      } else {
        setLocalNotes({ ...notes, [id]: updatedNote });
      }
    }
  };

  const hideNote = (id: string) => {
    const note = notes[id];
    if (note) {
      const updatedNote = { ...note, isHidden: !note.isHidden };
      if (user) {
        setCloudNotes((prev) => ({ ...prev, [id]: updatedNote }));
        void upsertCloudNote(updatedNote).catch((error) => {
          console.error("Failed to hide note", error);
        });
      } else {
        setLocalNotes({ ...notes, [id]: updatedNote });
      }
    }
  };

  return {
    loading: sessionLoading || (Boolean(user) && loading),
    notes,
    folders,
    addNote,
    addFolder,
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

async function seedLocalDataToCloud(
  cloudDb: Firestore,
  userId: string,
  localFolders: Folder[],
  localNotes: Record<string, Note>,
): Promise<boolean> {
  const foldersRef = collection(cloudDb, "users", userId, "folders");
  const notesRef = collection(cloudDb, "users", userId, "notes");

  const [foldersSnapshot, notesSnapshot] = await Promise.all([
    getDocs(foldersRef),
    getDocs(notesRef),
  ]);

  const cloudFolderIds = new Set(foldersSnapshot.docs.map((item) => item.id));
  const cloudNoteIds = new Set(notesSnapshot.docs.map((item) => item.id));

  const foldersToMigrate = localFolders.filter(
    (folder) => !cloudFolderIds.has(folder.id),
  );
  const notesToMigrate = Object.values(localNotes).filter(
    (note) => !cloudNoteIds.has(note.id),
  );

  if (foldersToMigrate.length === 0 && notesToMigrate.length === 0) {
    return false;
  }

  const notesRepo = createCloudNotesRepository(cloudDb, userId);
  const foldersRepo = createCloudFoldersRepository(cloudDb, userId);

  if (foldersToMigrate.length > 0) {
    await foldersRepo.upsertBatch(foldersToMigrate);
  }
  if (notesToMigrate.length > 0) {
    await notesRepo.upsertBatch(notesToMigrate);
  }

  return true;
}

export default useNotes;
