import { useMemo, useState } from "react";
import { Drawer, Grid, IconButton, useMediaQuery } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";

import useNotes, { type Note } from "../../hooks/useNotes";
import { selectedView, type SelectedView } from "../../utils/selectedView";
import {
  filterNotes,
  isNoteVisibleInView,
  getFirstSelectableNoteId,
} from "../../utils/filteredNotes";
import {
  searchNotes,
  sortByTrashedAtDesc,
  sortByUpdatedAtDesc,
} from "../../utils/noteQuery";
import { useSession } from "../../contexts/SessionContext";
import CreateFolderDialog from "./CreateFolderDialog/CreateFolderDialog";
import DeleteFolderDialog from "./DeleteFolderDialog/DeleteFolderDialog";
import EmptyTrashDialog from "./EmptyTrashDialog/EmptyTrashDialog";
import RenameFolderDialog from "./RenameFolderDialog/RenameFolderDialog";
import SignOutDialog from "./SignOutDialog/SignOutDialog";
import SearchNotesField from "./SearchNotesField/SearchNotesField";
import Sidebar from "./Sidebar/Sidebar";
import FolderView from "./FolderView/FolderView";
import { NoteEditorPanel } from "./NoteEditorPanel/NoteEditorPanel";
import { useScratchpad } from "./hooks/useScratchpad";
import { useViewState } from "./hooks/useViewState";
import { useDialogs } from "./hooks/useDialogs";
import { useOfflineStatus } from "./hooks/useOfflineStatus";

import "./MainView.css";

const SEARCHABLE_VIEWS: ReadonlySet<string> = new Set([
  selectedView.NOTES,
  selectedView.FAVORITES,
  selectedView.FOLDERS,
]);

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

const MainView = () => {
  const isMobile = useMediaQuery("(max-width:1024px)");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { state: viewState, dispatch: viewDispatch } = useViewState();
  const { state: dialogState, dispatch: dialogDispatch } = useDialogs();
  const { currentView, selectedFolderId, selectedNoteId } = viewState;
  const {
    openCreateFolder,
    openDeleteFolder,
    folderToDelete,
    openEmptyTrash,
    openRenameFolder,
    folderToRename,
    openSignOut,
  } = dialogState;

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
    renameFolder,
    deleteFolder,
    addFavorite,
    moveNoteToFolder,
    deleteNotes,
    restoreNote,
    updateNoteText,
    hideNote,
  } = useNotes();

  const scratchpad = useScratchpad();
  const offline = useOfflineStatus();

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

  const listedNotes = useMemo(() => {
    const visible = filterNotes(notes, currentView, selectedFolderId);
    const searched = searchNotes(visible, searchQuery);
    return currentView === selectedView.TRASH
      ? sortByTrashedAtDesc(searched)
      : sortByUpdatedAtDesc(searched);
  }, [notes, currentView, selectedFolderId, searchQuery]);

  const isSearchable = SEARCHABLE_VIEWS.has(currentView);
  const folderNoteCount = folderToDelete
    ? Object.values(notes).filter(
        (note) => note.folderId === folderToDelete.id && !note.isTrash,
      ).length
    : 0;

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

  const handleConfirmSignOut = () => {
    dialogDispatch({ type: "closeSignOut" });
    void signOut();
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleViewChange = (view: SelectedView) => {
    viewDispatch({ type: "viewChange", view });
    setSearchQuery("");
    closeMobileMenu();
  };

  const handleFolderSelect = (folderId: string) => {
    viewDispatch({ type: "folderSelect", folderId });
    setSearchQuery("");
    closeMobileMenu();
  };

  const handleRenameFolder = (folderName: string) => {
    if (folderToRename) {
      renameFolder(folderToRename.id, folderName);
    }
    dialogDispatch({ type: "closeRenameFolder" });
  };

  return (
    <div className="mainView">
      {isMobile && (
        <div className="mainView__mobileToolbar">
          <IconButton
            aria-label="Open navigation menu"
            aria-controls="mobile-navigation"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(true)}
          >
            <MenuIcon />
          </IconButton>
        </div>
      )}
      {isMobile && (
        <Drawer
          id="mobile-navigation"
          anchor="left"
          open={mobileMenuOpen}
          onClose={closeMobileMenu}
          slotProps={{ paper: { sx: { width: 300 } } }}
        >
          <Sidebar
            currentView={currentView}
            selectedFolderId={selectedFolderId}
            folders={folders}
            loading={loading || sessionLoading || scratchpad.loading}
            cloudEnabled={firebaseEnabled}
            cloudConnected={Boolean(user)}
            signedInEmail={user?.email ?? null}
            offline={Boolean(user) && offline}
            onCloudSignIn={signIn}
            onCloudSignOut={() => dialogDispatch({ type: "openSignOut" })}
            onViewChange={handleViewChange}
            onFolderSelect={handleFolderSelect}
            onAddFolder={() => {
              dialogDispatch({ type: "openCreateFolder" });
              closeMobileMenu();
            }}
            onDeleteFolder={(folder) =>
              dialogDispatch({ type: "openDeleteFolder", folder })
            }
            onRenameFolder={(folder) =>
              dialogDispatch({ type: "openRenameFolder", folder })
            }
            onNewNote={() => {
              handleNewNote();
              closeMobileMenu();
            }}
          />
        </Drawer>
      )}
      <Grid container spacing={3} className="mainView__gridContainer">
        {!isMobile && (
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
                offline={Boolean(user) && offline}
                onCloudSignIn={signIn}
                onCloudSignOut={() => dialogDispatch({ type: "openSignOut" })}
                onViewChange={handleViewChange}
                onFolderSelect={handleFolderSelect}
                onAddFolder={() => dialogDispatch({ type: "openCreateFolder" })}
                onDeleteFolder={(folder) =>
                  dialogDispatch({ type: "openDeleteFolder", folder })
                }
                onRenameFolder={(folder) =>
                  dialogDispatch({ type: "openRenameFolder", folder })
                }
                onNewNote={handleNewNote}
              />
            </div>
          </Grid>
        )}
        {currentView !== selectedView.SCRATCHPAD && (
          <Grid
            maxWidth={400}
            className="mainView__middlePanel"
            gap={1}
            padding={1}
            paddingX={0}
          >
            {isSearchable && (
              <SearchNotesField value={searchQuery} onChange={setSearchQuery} />
            )}
            <FolderView
              loading={loading}
              currentView={currentView}
              notes={listedNotes}
              folders={folders}
              selectedNoteId={effectiveSelectedNoteId}
              searchQuery={searchQuery}
              signedOut={!user}
              onFavNote={addFavorite}
              onTrashNote={handleTrashNote}
              onMoveNoteToFolder={moveNoteToFolder}
              onRestoreNote={restoreNote}
              onCardSelect={(noteId) =>
                viewDispatch({ type: "noteSelect", noteId })
              }
              onEmptyTrash={() => dialogDispatch({ type: "openEmptyTrash" })}
              onHideNote={hideNote}
              onNewNote={handleNewNote}
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
        noteCount={folderNoteCount}
        onDeleteFolder={handleConfirmDeleteFolder}
        onClose={() => dialogDispatch({ type: "closeDeleteFolder" })}
      />
      <EmptyTrashDialog
        isOpen={openEmptyTrash}
        onEmptyTrash={handleEmptyTrash}
        onClose={() => dialogDispatch({ type: "closeEmptyTrash" })}
      />
      <RenameFolderDialog
        key={
          folderToRename ? `${folderToRename.id}:${openRenameFolder}` : "closed"
        }
        isOpen={openRenameFolder}
        initialName={folderToRename?.name ?? ""}
        onRename={handleRenameFolder}
        onClose={() => dialogDispatch({ type: "closeRenameFolder" })}
      />
      <SignOutDialog
        isOpen={openSignOut}
        onConfirm={handleConfirmSignOut}
        onClose={() => dialogDispatch({ type: "closeSignOut" })}
      />
    </div>
  );
};

export default MainView;
