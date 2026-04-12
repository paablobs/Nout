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

/**
 * A React hook that provides notes & folders arrays and mutation functions.
 *
 * It delegates persistence to strategies (firestore / local). Because strategy
 * interfaces currently only guarantee `getNotes`, `getFolders`, `addNote` and
 * `addFolder`, this hook implements other mutations locally and persists them
 * to localStorage when the user is not authenticated. For authenticated users
 * the hook will update local state optimistically and still call `addNote` /
 * `addFolder` for creation; other server-side sync operations should be added
 * to the firestore strategy for full parity.
 */

// createNote removed — not used in this hook. Note creation is handled inline
// in `addNote` to avoid unused-symbol and placeholder logic.

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

  // load notes & folders from the selected strategy
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
        // cast to the strategy Folder[] type to avoid mismatches between local strategy
        // folder types (color optional) and the canonical Folder type which requires color.
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
    // Intentionally only depend on userId so reloads happen when auth changes.
  }, [userId, strategy]);

  // Helper to persist an updated note to localStorage (used when unauthenticated)
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

  // Helper to remove note(s) from localStorage (for permanent deletion)
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
      // build note. Caller may expect the note to be favored when currentView === FAVORITES;
      // we cannot import selectedView here without risking circulars; caller in MainView passes the right flag through currentView
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

      // set locally first
      setNotes((prev) => [note, ...prev]);

      // persist using strategy's addNote when available
      try {
        await strategy.addNote(note);
      } catch (err) {
        // if persistence failed and we are unauthenticated, ensure localStorage stays in sync
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
          // persist to localStorage for folders key
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

      // Persist changes locally if unauthenticated, otherwise persist to server
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
        // remove from local state
        setNotes((prev) => prev.filter((n) => !ids.includes(n.id)));
        if (!userId) {
          removeNotesFromLocalStorage(ids);
        } else {
          // TODO: implement server-side deletion in strategy
          // console.warn("Permanent deletion for authenticated users not implemented");
        }
      } else {
        // mark as trashed
        setNotes((prev) =>
          prev.map((n) =>
            ids.includes(n.id)
              ? { ...n, isTrash: true, updatedAt: new Date() }
              : n,
          ),
        );
        if (!userId) {
          // persist trashed flag
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
          // TODO: server-side trash implementation
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
        // TODO server-side restore
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
