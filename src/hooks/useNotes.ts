import { useCallback, useEffect, useState } from "react";
import { auth } from "../config/firebase";
import { v4 as uuidv4 } from "uuid";
import type { Note } from "../strategies/note.model";
import type { Folder } from "../strategies/folder.model";
import useFirestoreNotesStrategy from "../strategies/firebase/useFirestoreNotesStrategy";
import useLocalStorageNotesStrategy from "../strategies/local/useLocalStorageNotesStrategy";
import { storageKeys } from "../utils/storageKeys";
import {
  getLocalStorageItem,
  setLocalStorageItem,
} from "../utils/localStorageHelper";
import {
  toLocal,
  type LocalStorageNote,
} from "../strategies/local/local.mapper";

type NotesStrategy = {
  getNotes: () => Promise<Note[]>;
  getFolders: () => Promise<Folder[]>;
  addNote: (note: Note) => Promise<void>;
  addFolder: (folder: Folder) => Promise<void>;
  updateNote?: (note: Note) => Promise<void>;
};

const createFolder = (folderName: string): Folder => ({
  id: uuidv4(),
  name: folderName.trim(),
  color:
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0"),
});

export const useNotes = () => {
  const userId = auth?.currentUser?.uid;
  const localStrategy = useLocalStorageNotesStrategy();
  const firestoreStrategy = useFirestoreNotesStrategy(userId ?? "");
  const strategy = userId ? firestoreStrategy : localStrategy;

  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [ns, fs] = await Promise.all([
          strategy.getNotes(),
          strategy.getFolders(),
        ]);
        if (!mounted) return;
        setNotes(ns ?? []);
        setFolders((fs ?? []) as Folder[]);
      } catch (err) {
        // If fetching fails for authenticated firestore, try to fallback to local storage for stability
        if (!userId) {
          // when not authenticated, localStrategy should succeed; otherwise swallow
        } else {
          // logged user: log and keep local state (no-op)
          console.warn("Failed to load notes from firestore", err);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [userId, strategy]);

  const persistNoteToLocalStorage = useCallback((note: Note) => {
    try {
      const raw = getLocalStorageItem(storageKeys.NOTES);
      const parsed: Record<string, LocalStorageNote> = raw
        ? JSON.parse(raw)
        : {};
      const local = toLocal(note);
      const updated = { ...parsed, [local.id]: local };
      setLocalStorageItem(storageKeys.NOTES, updated);
    } catch {
      // swallow
    }
  }, []);

  const removeNotesFromLocalStorage = useCallback((ids: string[]) => {
    try {
      const raw = getLocalStorageItem(storageKeys.NOTES);
      const parsed: Record<string, LocalStorageNote> = raw
        ? JSON.parse(raw)
        : {};
      ids.forEach((id) => {
        delete parsed[id];
      });
      setLocalStorageItem(storageKeys.NOTES, parsed);
    } catch {
      // swallow
    }
  }, []);

  const addNote = useCallback(
    async (_currentView: string, selectedFolderId?: string) => {
      const now = new Date();
      const note: Note = {
        id: uuidv4(),
        text: "",
        folderId: selectedFolderId ?? null,
        isFav: false,
        isTrash: false,
        isHidden: false,
        createdAt: now,
        updatedAt: now,
      };

      setNotes((prev) => [note, ...prev]);

      try {
        await strategy.addNote(note);
      } catch (err) {
        if (!userId) {
          persistNoteToLocalStorage(note);
        } else {
          console.warn("Failed to persist new note to remote", err);
        }
      }

      return note.id;
    },
    [strategy, userId, persistNoteToLocalStorage],
  );

  const addFolder = useCallback(
    async (folderName: string) => {
      if (!folderName.trim()) return;
      const folder = createFolder(folderName);

      setFolders((prev) => [folder, ...prev]);

      try {
        await strategy.addFolder(folder);
      } catch (err) {
        if (!userId) {
          try {
            const raw = getLocalStorageItem(storageKeys.FOLDERS);
            const parsed: Folder[] = raw ? JSON.parse(raw) : [];
            setLocalStorageItem(storageKeys.FOLDERS, [folder, ...parsed]);
          } catch {
            // swallow
          }
        } else {
          console.warn("Failed to persist new folder remotely", err);
        }
      }
    },
    [strategy, userId],
  );

  const getNoteById = useCallback(
    (id: string) => {
      return notes.find((n) => n.id === id) ?? null;
    },
    [notes],
  );

  const updateNote = useCallback(
    async (id: string, patch: Partial<Note>) => {
      let updatedNote: Note | null = null;
      setNotes((prev) => {
        const idx = prev.findIndex((n) => n.id === id);
        if (idx === -1) return prev;
        const base = prev[idx];
        const merged: Note = {
          ...base,
          ...patch,
          updatedAt: new Date(),
        };
        updatedNote = merged;
        const copy = [...prev];
        copy[idx] = merged;
        return copy;
      });

      if (!updatedNote) return;

      if (!userId) {
        persistNoteToLocalStorage(updatedNote);
      } else {
        const s = strategy as NotesStrategy;
        if (s.updateNote) {
          try {
            await s.updateNote(updatedNote);
          } catch (e) {
            console.warn("Failed to persist note update to Firestore", e);
          }
        }
      }
    },
    [userId, persistNoteToLocalStorage, strategy],
  );

  const toggleFavorite = useCallback(
    async (id: string) => {
      const note = notes.find((n) => n.id === id);
      if (!note) return;
      await updateNote(id, { isFav: !note.isFav });
    },
    [notes, updateNote],
  );

  const moveNoteToFolder = useCallback(
    async (noteId: string, folderId: string | null) => {
      await updateNote(noteId, { folderId });
    },
    [updateNote],
  );

  const deleteNotes = useCallback(
    async (ids: string[], permanent = false) => {
      if (permanent) {
        setNotes((prev) => prev.filter((n) => !ids.includes(n.id)));
        if (!userId) {
          removeNotesFromLocalStorage(ids);
        } else {
          console.warn(
            "Permanent deletion for authenticated users not implemented",
          );
        }
      } else {
        setNotes((prev) =>
          prev.map((n) =>
            ids.includes(n.id)
              ? { ...n, isTrash: true, updatedAt: new Date() }
              : n,
          ),
        );
        if (!userId) {
          const raw = getLocalStorageItem(storageKeys.NOTES);
          const parsed: Record<string, LocalStorageNote> = raw
            ? JSON.parse(raw)
            : {};
          ids.forEach((id) => {
            const existing = parsed[id];
            if (existing) {
              const updatedLocal = {
                ...existing,
                isTrash: true,
                isHidden: false,
              };
              parsed[id] = updatedLocal;
            }
          });
          setLocalStorageItem(storageKeys.NOTES, parsed);
        } else {
          console.warn("Trash for authenticated users not implemented");
        }
      }
    },
    [userId, removeNotesFromLocalStorage],
  );

  const restoreNote = useCallback(
    async (id: string) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, isTrash: false, isHidden: false, updatedAt: new Date() }
            : n,
        ),
      );
      if (!userId) {
        const raw = getLocalStorageItem(storageKeys.NOTES);
        const parsed: Record<string, LocalStorageNote> = raw
          ? JSON.parse(raw)
          : {};
        const existing = parsed[id];
        if (existing) {
          parsed[id] = { ...existing, isTrash: false, isHidden: false };
          setLocalStorageItem(storageKeys.NOTES, parsed);
        }
      } else {
        console.warn("Restore for authenticated users not implemented");
      }
    },
    [userId],
  );

  const updateNoteText = useCallback(
    async (id: string, text: string) => {
      await updateNote(id, { text });
    },
    [updateNote],
  );

  const hideNote = useCallback(
    async (id: string) => {
      const note = notes.find((n) => n.id === id);
      if (!note) return;
      await updateNote(id, { isHidden: !note.isHidden });
    },
    [notes, updateNote],
  );

  return {
    notes,
    folders,
    loading,
    addNote,
    addFolder,
    toggleFavorite,
    moveNoteToFolder,
    deleteNotes,
    restoreNote,
    getNoteById,
    updateNoteText,
    hideNote,
  };
};

export default useNotes;
