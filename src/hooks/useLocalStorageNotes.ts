import { selectedView } from "../utils/selectedView";
import { storageKeys } from "../utils/storageKeys";
import { useLocalStorage } from "./useLocalStorage";
import { v4 as uuidv4 } from "uuid";
import randomColor from "../utils/randomColor";

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

export const DEFAULT_CATEGORY = "All notes";

const useLocalStorageNotes = () => {
  const [folders, setFolders] = useLocalStorage<Folder[]>(
    storageKeys.FOLDERS,
    [],
  );
  const [notes, setNotes] = useLocalStorage<Record<string, Note>>(
    storageKeys.NOTES,
    {},
  );

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
    setNotes({ [newNote.id]: newNote, ...notes });
    return newNote.id;
  };

  const addFolder = (folderName: string) => {
    if (folderName.trim()) {
      const newFolder: Folder = {
        id: uuidv4(),
        name: folderName.trim(),
        color: randomColor(),
      };
      setFolders([newFolder, ...folders]);
    }
  };

  const deleteFolder = (id: string) => {
    setFolders(folders.filter((folder) => folder.id !== id));
    setNotes(
      Object.fromEntries(
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
      ),
    );
  };

  const addFavorite = (id: string) => {
    const note = notes[id];
    if (note) {
      const updatedNote = { ...note, isFav: !note.isFav };
      setNotes({ ...notes, [id]: updatedNote });
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
        category: folder ? folder.name : note.category,
      };
      setNotes({ ...notes, [noteId]: updatedNote });
    }
  };

  const deleteNotes = (ids: string[], permanent = false) => {
    if (permanent) {
      const updatedNotes = { ...notes };
      ids.forEach((id) => {
        delete updatedNotes[id];
      });
      setNotes(updatedNotes);
    } else {
      const updatedNotes = { ...notes };
      ids.forEach((id) => {
        if (updatedNotes[id]) {
          updatedNotes[id] = { ...updatedNotes[id], isTrash: true };
        }
      });
      setNotes(updatedNotes);
    }
  };

  const restoreNote = (id: string) => {
    const note = notes[id];
    if (note && note.isTrash) {
      const restoredNote = { ...note, isTrash: false, isHidden: false };
      setNotes({ ...notes, [id]: restoredNote });
    }
  };

  const getNoteById = (id: string) => {
    return notes[id] || null;
  };

  const updateNoteText = (id: string, text: string) => {
    const note = notes[id];
    if (note) {
      const updatedNote = { ...note, text };
      setNotes({ ...notes, [id]: updatedNote });
    }
  };

  const hideNote = (id: string) => {
    const note = notes[id];
    if (note) {
      const updatedNote = { ...note, isHidden: !note.isHidden };
      setNotes({ ...notes, [id]: updatedNote });
    }
  };

  return {
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

export default useLocalStorageNotes;
