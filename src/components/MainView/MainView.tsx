import { useMemo } from "react";
import { Grid, Skeleton } from "@mui/material";

import useNotes, { type Note } from "../../hooks/useNotes";
import { selectedView, type SelectedView } from "../../utils/selectedView";
import { useSession } from "../../contexts/SessionContext";
import Tiptap from "../TextEditor/TipTap";
import CreateFolderDialog from "./CreateFolderDialog/CreateFolderDialog";
import DeleteFolderDialog from "./DeleteFolderDialog/DeleteFolderDialog";
import EmptyTrashDialog from "./EmptyTrashDialog/EmptyTrashDialog";
import Sidebar from "./Sidebar/Sidebar";
import FolderView from "./FolderView/FolderView";
import { useScratchpad } from "./hooks/useScratchpad";
import { useViewState } from "./hooks/useViewState";
import { useDialogs } from "./hooks/useDialogs";

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

const resolveEffectiveSelectedNoteId = (
  currentView: SelectedView,
  selectedNoteId: string | null,
  notes: Record<string, Note>,
  selectedFolderId: string | null,
) => {
  if (currentView === selectedView.SCRATCHPAD) {
    return null;
  }

  const selectedNote = selectedNoteId ? (notes[selectedNoteId] ?? null) : null;
  if (isNoteVisibleInView(selectedNote, currentView, selectedFolderId)) {
    return selectedNoteId;
  }

  return getFirstSelectableNoteId(notes, currentView, selectedFolderId);
};

interface NoteEditorPanelProps {
  loading: boolean;
  currentView: SelectedView;
  scratchpadValue: string;
  selectedNote: Note | null;
  effectiveSelectedNoteId: string | null;
  onChange: (value: string) => void;
}

const NoteEditorPanel = ({
  loading,
  currentView,
  scratchpadValue,
  selectedNote,
  effectiveSelectedNoteId,
  onChange,
}: NoteEditorPanelProps) => {
  const showEditor =
    Boolean(effectiveSelectedNoteId) || currentView === selectedView.SCRATCHPAD;

  if (!showEditor) return null;

  const content =
    currentView === selectedView.SCRATCHPAD
      ? scratchpadValue
      : selectedNote
        ? selectedNote.text
        : "";

  return (
    <Grid size="grow" className="mainView__rightPanel">
      {loading ? (
        <Skeleton variant="rectangular" width="100%" height="100%" />
      ) : (
        <Tiptap
          content={content}
          onChange={onChange}
          editable={currentView !== selectedView.TRASH}
          key={effectiveSelectedNoteId || selectedView.SCRATCHPAD}
        />
      )}
    </Grid>
  );
};

const MainView = () => {
  const { state: viewState, dispatch: viewDispatch } = useViewState();
  const { state: dialogState, dispatch: dialogDispatch } = useDialogs();
  const { currentView, selectedFolderId, selectedNoteId } = viewState;
  const { openCreateFolder, openDeleteFolder, folderToDelete, openEmptyTrash } =
    dialogState;

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
    updateNoteText,
    hideNote,
  } = useNotes();

  const scratchpad = useScratchpad();

  const effectiveSelectedNoteId = useMemo(
    () =>
      resolveEffectiveSelectedNoteId(
        currentView,
        selectedNoteId,
        notes,
        selectedFolderId,
      ),
    [currentView, selectedNoteId, notes, selectedFolderId],
  );

  const selectedNote = effectiveSelectedNoteId
    ? (notes[effectiveSelectedNoteId] ?? null)
    : null;

  const handleNewNote = () => {
    if (loading) return;
    const noteId = addNote(currentView, selectedFolderId || undefined);
    viewDispatch({ type: "noteSelect", noteId });
  };

  const handleEditorChange = (value: string) => {
    if (currentView === selectedView.SCRATCHPAD) {
      scratchpad.setValue(value);
    } else if (effectiveSelectedNoteId) {
      updateNoteText(effectiveSelectedNoteId, value);
    }
  };

  const handleTrashNote = (id: string) => {
    deleteNotes([id]);
    viewDispatch({ type: "noteSelect", noteId: null });
  };

  const handleConfirmDeleteFolder = () => {
    if (folderToDelete) {
      deleteFolder(folderToDelete.id);
      viewDispatch({ type: "clearFolderSelection" });
    }
    dialogDispatch({ type: "closeDeleteFolder" });
  };

  const handleEmptyTrash = () => {
    const trashNoteIds = Object.keys(notes).filter((id) => notes[id].isTrash);
    deleteNotes(trashNoteIds, true);
    dialogDispatch({ type: "closeEmptyTrash" });
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
              loading={loading || sessionLoading || scratchpad.loading}
              cloudEnabled={firebaseEnabled}
              cloudConnected={Boolean(user)}
              signedInEmail={user?.email ?? null}
              onCloudSignIn={signIn}
              onCloudSignOut={signOut}
              onViewChange={(view) =>
                viewDispatch({ type: "viewChange", view })
              }
              onFolderSelect={(folderId) =>
                viewDispatch({ type: "folderSelect", folderId })
              }
              onAddFolder={() => dialogDispatch({ type: "openCreateFolder" })}
              onDeleteFolder={(folder) =>
                dialogDispatch({ type: "openDeleteFolder", folder })
              }
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
              onFavNote={addFavorite}
              onTrashNote={handleTrashNote}
              onMoveNoteToFolder={moveNoteToFolder}
              onRestoreNote={restoreNote}
              onCardSelect={(noteId) =>
                viewDispatch({ type: "noteSelect", noteId })
              }
              onEmptyTrash={() => dialogDispatch({ type: "openEmptyTrash" })}
              onHideNote={hideNote}
            />
          </Grid>
        )}
        <NoteEditorPanel
          loading={loading}
          currentView={currentView}
          scratchpadValue={scratchpad.value}
          selectedNote={selectedNote}
          effectiveSelectedNoteId={effectiveSelectedNoteId}
          onChange={handleEditorChange}
        />
      </Grid>
      <CreateFolderDialog
        isOpen={openCreateFolder}
        onAddFolder={addFolder}
        onClose={() => dialogDispatch({ type: "closeCreateFolder" })}
      />
      <DeleteFolderDialog
        isOpen={openDeleteFolder}
        folderName={folderToDelete?.name}
        onDeleteFolder={handleConfirmDeleteFolder}
        onClose={() => dialogDispatch({ type: "closeDeleteFolder" })}
      />
      <EmptyTrashDialog
        isOpen={openEmptyTrash}
        onEmptyTrash={handleEmptyTrash}
        onClose={() => dialogDispatch({ type: "closeEmptyTrash" })}
      />
    </div>
  );
};

export default MainView;
