import { selectedView } from "../utils/selectedView";
import { storageKeys } from "../utils/storageKeys";
import { useLocalStorage } from "./useLocalStorage";
import { v4 as uuidv4 } from "uuid";
import randomColor from "../utils/randomColor";
import { DEFAULT_CATEGORY } from "../utils/constants";
import { useSession } from "../contexts/SessionContext";
import { db } from "../config/firebase";
import {
  collection,
  deleteDoc,
  doc,
  type Firestore,
  getDocs,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { useEffect, useEffectEvent, useState } from "react";

export interface Folder {
  id: string;
  name: string;
  color?: string;
}

export interface Note {
  id: string;
  text: string;
  category: string;
  isFav: boolean;
  isTrash: boolean;
  isHidden: boolean;
  folderId?: string;
}

const toNotesRecord = (notesList: Note[]) =>
  Object.fromEntries(notesList.map((note) => [note.id, note])) as Record<
    string,
    Note
  >;

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

  const seedLocalDataToCloud = useEffectEvent(
    async (
      cloudDb: Firestore,
      foldersRef: ReturnType<typeof collection>,
      notesRef: ReturnType<typeof collection>,
    ) => {
      if (localFolders.length === 0 && Object.keys(localNotes).length === 0) {
        return false;
      }

      const batch = writeBatch(cloudDb);
      localFolders.forEach((folder) => {
        batch.set(doc(foldersRef, folder.id), folder);
      });
      Object.values(localNotes).forEach((note) => {
        batch.set(doc(notesRef, note.id), note);
      });
      await batch.commit();

      setCloudFolders(localFolders);
      setCloudNotes(localNotes);
      return true;
    },
  );

  useEffect(() => {
    if (!user || !db) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const cloudDb = db;
    const userId = user.uid;

    void (async () => {
      const foldersRef = collection(cloudDb, "users", userId, "folders");
      const notesRef = collection(cloudDb, "users", userId, "notes");

      setLoading(true);
      try {
        const [foldersSnapshot, notesSnapshot] = await Promise.all([
          getDocs(foldersRef),
          getDocs(notesRef),
        ]);

        if (controller.signal.aborted) return;

        const nextFolders = foldersSnapshot.docs.map(
          (item) => item.data() as Folder,
        );
        const nextNotesList = notesSnapshot.docs.map(
          (item) => item.data() as Note,
        );

        if (nextFolders.length === 0 && nextNotesList.length === 0) {
          const didSeed = await seedLocalDataToCloud(
            cloudDb,
            foldersRef,
            notesRef,
          );

          if (controller.signal.aborted) return;

          if (didSeed) {
            return;
          }
        }

        setCloudFolders(nextFolders);
        setCloudNotes(toNotesRecord(nextNotesList));
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
    await setDoc(doc(db, "users", user.uid, "notes", note.id), note);
  };

  const upsertCloudFolder = async (folder: Folder) => {
    if (!user || !db) return;
    await setDoc(doc(db, "users", user.uid, "folders", folder.id), folder);
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

      const affectedNoteIds = Object.entries(notes)
        .filter(([, note]) => note.folderId === id)
        .map(([noteId]) => noteId);

      void (async () => {
        try {
          await deleteDoc(doc(cloudDb, "users", userId, "folders", id));
          const batch = writeBatch(cloudDb);
          affectedNoteIds.forEach((noteId) => {
            const note = updatedNotes[noteId];
            if (note) {
              const noteData = { ...note };
              delete noteData.folderId;
              batch.set(
                doc(cloudDb, "users", userId, "notes", noteId),
                noteData,
              );
            }
          });
          await batch.commit();
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
        void upsertCloudNote(updatedNote).catch((error) => {
          console.error("Failed to update favorite", error);
        });
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
        void upsertCloudNote(noteData).catch((error) => {
          console.error("Failed to move note to folder", error);
        });
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
            const batch = writeBatch(cloudDb);
            ids.forEach((id) => {
              batch.delete(doc(cloudDb, "users", userId, "notes", id));
            });
            await batch.commit();
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
            const batch = writeBatch(cloudDb);
            ids.forEach((id) => {
              const nextNote = updatedNotes[id];
              if (nextNote) {
                batch.set(doc(cloudDb, "users", userId, "notes", id), nextNote);
              }
            });
            await batch.commit();
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
        void upsertCloudNote(updatedNote).catch((error) => {
          console.error("Failed to update note", error);
        });
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

export default useNotes;
