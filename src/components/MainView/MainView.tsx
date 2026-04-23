import { useEffect, useEffectEvent, useRef, useState } from "react";

// Components & Icons
import { Grid, Skeleton } from "@mui/material";

// Custom Hooks & Styles & Components
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { selectedView, type SelectedView } from "../../utils/selectedView";
import { storageKeys } from "../../utils/storageKeys";
import Tiptap from "../TextEditor/TipTap";
import CreateFolderDialog from "./CreateFolderDialog/CreateFolderDialog";
import DeleteFolderDialog from "./DeleteFolderDialog/DeleteFolderDialog";
import EmptyTrashDialog from "./EmptyTrashDialog/EmptyTrashDialog";
import Sidebar from "./Sidebar/Sidebar";
import FolderView from "./FolderView/FolderView";
import useNotes, { type Folder, type Note } from "../../hooks/useNotes";
import { DEFAULT_SCRATCHPAD_CONTENT } from "../../utils/constants";
import { useSession } from "../../contexts/SessionContext";
import { db } from "../../config/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// styles
import "./MainView.css";

const isNoteVisibleInView = (
  note: Note | null,
  view: SelectedView,
  folderId: string | null,
) => {
  if (!note) return false;

  if (view === selectedView.NOTES) {
    return !note.isTrash && !note.isHidden;
  }

  if (view === selectedView.FAVORITES) {
    return note.isFav && !note.isTrash && !note.isHidden;
  }

  if (view === selectedView.TRASH) {
    return note.isTrash;
  }

  if (view === selectedView.FOLDERS) {
    return note.folderId === folderId && !note.isTrash;
  }

  return false;
};

const getFirstSelectableNoteId = (
  notes: Record<string, Note>,
  view: SelectedView,
  folderId: string | null,
) => {
  if (view === selectedView.SCRATCHPAD) {
    return null;
  }

  return (
    Object.values(notes).find((note) =>
      isNoteVisibleInView(note, view, folderId),
    )?.id ?? null
  );
};

const MainView = () => {
  const [openCreateFolderDialog, setOpenCreateFolderDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<null | Folder>(null);
  const [openEmptyTrashDialog, setOpenEmptyTrashDialog] = useState(false);
  const [currentView, setCurrentView] = useState<SelectedView>(
    selectedView.NOTES,
  );
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [scratchpadValue, setScratchpadValue] = useLocalStorage<string>(
    storageKeys.SCRATCHPAD,
    DEFAULT_SCRATCHPAD_CONTENT,
  );
  const [cloudScratchpadValue, setCloudScratchpadValue] = useState(
    DEFAULT_SCRATCHPAD_CONTENT,
  );
  const [scratchpadLoading, setScratchpadLoading] = useState(false);
  const scratchpadSeededRef = useRef(false);

  const {
    user,
    loading: sessionLoading,
    signIn,
    signOut,
    firebaseEnabled,
  } = useSession();

  const {
    loading,
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
  } = useNotes();

  const seedLocalScratchpad = useEffectEvent(
    async (scratchpadRef: ReturnType<typeof doc>) => {
      setCloudScratchpadValue(scratchpadValue);
      await setDoc(scratchpadRef, { value: scratchpadValue }, { merge: true });
    },
  );

  useEffect(() => {
    scratchpadSeededRef.current = false;

    if (!user || !db) {
      setScratchpadLoading(false);
      return;
    }

    const controller = new AbortController();
    const cloudDb = db;
    const userId = user.uid;

    void (async () => {
      const scratchpadRef = doc(cloudDb, "users", userId, "meta", "scratchpad");

      setScratchpadLoading(true);
      try {
        const scratchpadSnapshot = await getDoc(scratchpadRef);
        if (controller.signal.aborted) return;

        if (scratchpadSnapshot.exists()) {
          const cloudValue =
            (scratchpadSnapshot.data() as { value?: string }).value ??
            DEFAULT_SCRATCHPAD_CONTENT;
          setCloudScratchpadValue(cloudValue);
        } else {
          await seedLocalScratchpad(scratchpadRef);
        }

        if (controller.signal.aborted) return;
        scratchpadSeededRef.current = true;
      } catch (error) {
        console.error("Failed to load scratchpad", error);
      } finally {
        if (!controller.signal.aborted) {
          setScratchpadLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [user]);

  useEffect(() => {
    if (!user || !db || !scratchpadSeededRef.current) return;

    const scratchpadRef = doc(db, "users", user.uid, "meta", "scratchpad");
    const timer = window.setTimeout(() => {
      void setDoc(
        scratchpadRef,
        { value: cloudScratchpadValue },
        { merge: true },
      );
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [user, cloudScratchpadValue]);

  const effectiveSelectedNoteId = (() => {
    if (currentView === selectedView.SCRATCHPAD) {
      return null;
    }

    const selectedNote = selectedNoteId
      ? (notes[selectedNoteId] ?? null)
      : null;
    if (isNoteVisibleInView(selectedNote, currentView, selectedFolderId)) {
      return selectedNoteId;
    }

    return getFirstSelectableNoteId(notes, currentView, selectedFolderId);
  })();

  const getSelectedNote = () =>
    getNoteById(effectiveSelectedNoteId || "") || null;

  const handleClickOpen = () => {
    setOpenCreateFolderDialog(true);
  };

  const handleClose = () => {
    setOpenCreateFolderDialog(false);
  };

  const handleAddFolder = (folderName: string) => {
    addFolder(folderName);
  };

  const handleOpenDeleteDialog = (folder: Folder) => {
    setFolderToDelete(folder);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setFolderToDelete(null);
  };

  const handleConfirmDeleteFolder = () => {
    if (folderToDelete) {
      handleDeleteFolder(folderToDelete.id);
    }
    handleCloseDeleteDialog();
  };

  const handleDeleteFolder = (id: string) => {
    deleteFolder(id);
    setSelectedFolderId(null);
  };

  const handleNewNote = () => {
    if (loading) return;
    const noteId = addNote(currentView, selectedFolderId || undefined);
    setSelectedNoteId(noteId);
  };

  const handleFavNote = (id: string) => {
    addFavorite(id);
  };

  const handleHideNote = (id: string) => {
    hideNote(id);
  };

  const handleMoveNoteToFolder = (noteId: string, folderId: string | null) => {
    moveNoteToFolder(noteId, folderId);
  };

  const handleTrashNote = (id: string) => {
    deleteNotes([id]);
    setSelectedNoteId(null);
  };

  const handleRestoreNote = (id: string) => {
    restoreNote(id);
  };

  const handleEditorChange = (value: string) => {
    if (currentView === selectedView.SCRATCHPAD) {
      if (user) {
        setCloudScratchpadValue(value);
      } else {
        setScratchpadValue(value);
      }
    } else if (effectiveSelectedNoteId) {
      updateNoteText(effectiveSelectedNoteId, value);
    }
  };

  const getEditorContent = () => {
    if (currentView === selectedView.SCRATCHPAD) {
      return user ? cloudScratchpadValue : scratchpadValue;
    } else {
      const note = getSelectedNote();
      return note ? note.text : "";
    }
  };

  const handleViewChange = (view: SelectedView) => {
    setCurrentView(view);
  };

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolderId(folderId);
  };

  return (
    <div className="mainView">
      <Grid container spacing={3} className="mainView__gridContainer">
        <Grid width={300}>
          <div className="mainView__leftPanel">
            <Sidebar
              currentView={currentView}
              selectedFolderId={selectedFolderId}
              folders={folders}
              loading={loading || sessionLoading || scratchpadLoading}
              cloudEnabled={firebaseEnabled}
              cloudConnected={Boolean(user)}
              signedInEmail={user?.email ?? null}
              onCloudSignIn={signIn}
              onCloudSignOut={signOut}
              onViewChange={handleViewChange}
              onFolderSelect={handleFolderSelect}
              onAddFolder={handleClickOpen}
              onDeleteFolder={handleOpenDeleteDialog}
              onNewNote={handleNewNote}
            />
          </div>
        </Grid>
        {currentView !== selectedView.SCRATCHPAD && (
          <Grid
            maxWidth={400}
            className="mainView__middlePanel"
            gap={1}
            padding={1}
            paddingX={0}
          >
            <FolderView
              loading={loading}
              currentView={currentView}
              notes={notes}
              folders={folders}
              selectedFolderId={selectedFolderId}
              selectedNoteId={effectiveSelectedNoteId}
              onFavNote={handleFavNote}
              onTrashNote={handleTrashNote}
              onMoveNoteToFolder={handleMoveNoteToFolder}
              onRestoreNote={handleRestoreNote}
              onCardSelect={setSelectedNoteId}
              onEmptyTrash={() => setOpenEmptyTrashDialog(true)}
              onHideNote={handleHideNote}
            />
          </Grid>
        )}
        {(effectiveSelectedNoteId ||
          currentView === selectedView.SCRATCHPAD) && (
          <Grid size="grow" className="mainView__rightPanel">
            {loading ? (
              <Skeleton variant="rectangular" width="100%" height="100%" />
            ) : (
              <Tiptap
                content={getEditorContent()}
                onChange={handleEditorChange}
                editable={currentView !== selectedView.TRASH}
                key={effectiveSelectedNoteId || selectedView.SCRATCHPAD}
              />
            )}
          </Grid>
        )}
      </Grid>
      <CreateFolderDialog
        isOpen={openCreateFolderDialog}
        onAddFolder={handleAddFolder}
        onClose={handleClose}
      />
      <DeleteFolderDialog
        isOpen={openDeleteDialog}
        folderName={folderToDelete?.name}
        onDeleteFolder={handleConfirmDeleteFolder}
        onClose={handleCloseDeleteDialog}
      />
      <EmptyTrashDialog
        isOpen={openEmptyTrashDialog}
        onEmptyTrash={() => {
          const trashNoteIds = Object.keys(notes).filter(
            (id) => notes[id].isTrash,
          );
          deleteNotes(trashNoteIds, true);
          setOpenEmptyTrashDialog(false);
        }}
        onClose={() => setOpenEmptyTrashDialog(false)}
      />
    </div>
  );
};

export default MainView;
