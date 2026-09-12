import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Chip,
  Drawer,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonIcon from "@mui/icons-material/Person";

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
import FolderList from "./FolderList/FolderList";
import { NoteEditorPanel } from "./NoteEditorPanel/NoteEditorPanel";
import BottomNav from "./BottomNav/BottomNav";
import FabNewNote from "./FabNewNote/FabNewNote";
import { useScratchpad } from "./hooks/useScratchpad";
import { useViewState, type ViewState } from "./hooks/useViewState";
import { useDialogs } from "./hooks/useDialogs";
import { useOfflineStatus } from "./hooks/useOfflineStatus";

import "./MainView.css";

const SEARCHABLE_VIEWS: ReadonlySet<string> = new Set([
  selectedView.NOTES,
  selectedView.FAVORITES,
  selectedView.FOLDERS,
]);

interface PhoneHistoryState {
  noutNavigation: true;
  viewState: ViewState;
}

const phoneHistoryState = (viewState: ViewState): PhoneHistoryState => ({
  noutNavigation: true,
  viewState,
});

const phoneParentState = (viewState: ViewState): ViewState => {
  if (viewState.selectedNoteId) {
    return { ...viewState, selectedNoteId: null };
  }
  if (viewState.currentView === selectedView.SCRATCHPAD) {
    return {
      currentView: selectedView.NOTES,
      selectedFolderId: null,
      selectedNoteId: null,
    };
  }
  if (
    viewState.currentView === selectedView.FOLDERS &&
    viewState.selectedFolderId
  ) {
    return { ...viewState, selectedFolderId: null };
  }
  return viewState;
};

const needsPhoneParentEntry = (viewState: ViewState): boolean =>
  Boolean(viewState.selectedNoteId) ||
  viewState.currentView === selectedView.SCRATCHPAD ||
  (viewState.currentView === selectedView.FOLDERS &&
    Boolean(viewState.selectedFolderId));

const isPhoneHistoryState = (state: unknown): state is PhoneHistoryState => {
  if (!state || typeof state !== "object") return false;

  const candidate = state as {
    noutNavigation?: unknown;
    viewState?: Partial<ViewState>;
  };
  const viewState = candidate.viewState;
  if (!viewState) return false;

  return (
    candidate.noutNavigation === true &&
    Object.values(selectedView).includes(
      viewState.currentView as SelectedView,
    ) &&
    (typeof viewState.selectedFolderId === "string" ||
      viewState.selectedFolderId === null) &&
    (typeof viewState.selectedNoteId === "string" ||
      viewState.selectedNoteId === null)
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

const MainView = () => {
  const theme = useTheme();
  const isBelowDesktop = useMediaQuery(theme.breakpoints.down("md"));
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
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
  const [accountAnchor, setAccountAnchor] = useState<null | HTMLElement>(null);

  const viewStateRef = useRef(viewState);
  viewStateRef.current = viewState;

  const effectiveSelectedNoteId = useMemo(() => {
    if (currentView === selectedView.SCRATCHPAD) return null;
    // On phones the editor must show exactly the selected note. Falling back
    // to the first visible note would display and edit a different note when
    // the selection goes stale (trashed or removed elsewhere).
    if (isPhone) {
      const selectedNote = selectedNoteId
        ? (notes[selectedNoteId] ?? null)
        : null;
      return isNoteVisibleInView(selectedNote, currentView, selectedFolderId)
        ? selectedNoteId
        : null;
    }
    return resolveEffectiveSelectedNoteId(
      currentView,
      selectedNoteId,
      notes,
      selectedFolderId,
    );
  }, [currentView, selectedNoteId, notes, selectedFolderId, isPhone]);

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

  const isTablet = isBelowDesktop && !isPhone;

  // Phone drill-down: editor visible only when the selected note is still
  // visible in the current view, or scratchpad
  const showEditorOnPhone =
    isPhone &&
    (Boolean(effectiveSelectedNoteId) ||
      currentView === selectedView.SCRATCHPAD);
  const showList =
    !showEditorOnPhone && currentView !== selectedView.SCRATCHPAD;
  const showFolderList =
    isPhone && currentView === selectedView.FOLDERS && !selectedFolderId;
  const showFolderBack =
    isPhone &&
    !showEditorOnPhone &&
    currentView === selectedView.FOLDERS &&
    Boolean(selectedFolderId);

  const showEditor = isPhone
    ? showEditorOnPhone
    : Boolean(effectiveSelectedNoteId) ||
      currentView === selectedView.SCRATCHPAD;

  // Editor title for the phone AppBar
  const editorTitle = useMemo(() => {
    if (currentView === selectedView.SCRATCHPAD) return "Scratchpad";
    if (currentView === selectedView.TRASH) return "Trash";
    if (selectedNote?.folderId) {
      const folder = folders.find((f) => f.id === selectedNote.folderId);
      return folder?.name ?? "Notes";
    }
    return "Notes";
  }, [currentView, selectedNote, folders]);

  // View title for the phone top bar
  const viewTitle = useMemo(() => {
    if (currentView === selectedView.SCRATCHPAD) return "Scratchpad";
    if (currentView === selectedView.TRASH) return "Trash";
    if (currentView === selectedView.NOTES) return "Notes";
    if (currentView === selectedView.FAVORITES) return "Favorites";
    if (currentView === selectedView.FOLDERS && selectedFolderId) {
      const folder = folders.find((f) => f.id === selectedFolderId);
      return folder?.name ?? "Folders";
    }
    return "Folders";
  }, [currentView, selectedFolderId, folders]);

  // History API for phone drill-down. The popstate listener stays attached on
  // all layouts so entries pushed on a phone still restore state when they
  // are consumed after rotating to a wider layout.
  useEffect(() => {
    const handlePop = (event: PopStateEvent) => {
      if (isPhoneHistoryState(event.state)) {
        viewDispatch({
          type: "navigationRestore",
          state: event.state.viewState,
        });
      }
    };
    window.addEventListener("popstate", handlePop);

    if (isPhone) {
      // Tag the current entry so back/forward restores view state. When the
      // phone layout is entered with an editor or folder already open (e.g. a
      // note opened on desktop, then the window narrowed), insert a parent
      // list entry first so the back button returns to the list instead of
      // leaving the app.
      const current = viewStateRef.current;
      const top = history.state;
      const topMatchesCurrent =
        isPhoneHistoryState(top) &&
        top.viewState.currentView === current.currentView &&
        top.viewState.selectedFolderId === current.selectedFolderId &&
        top.viewState.selectedNoteId === current.selectedNoteId;
      if (!topMatchesCurrent) {
        if (needsPhoneParentEntry(current)) {
          history.replaceState(
            phoneHistoryState(phoneParentState(current)),
            "",
          );
          history.pushState(phoneHistoryState(current), "");
        } else {
          history.replaceState(phoneHistoryState(current), "");
        }
      }
    }
    return () => window.removeEventListener("popstate", handlePop);
  }, [isPhone, viewDispatch]);

  const handleNewNote = () => {
    if (loading) return;
    const noteId = addNote(currentView, selectedFolderId || undefined);
    viewDispatch({ type: "noteSelect", noteId });
    if (isPhone) {
      history.pushState(
        phoneHistoryState({
          currentView,
          selectedFolderId,
          selectedNoteId: noteId,
        }),
        "",
      );
    }
  };

  const handleNoteSelect = useCallback(
    (noteId: string) => {
      viewDispatch({ type: "noteSelect", noteId });
      if (isPhone) {
        history.pushState(
          phoneHistoryState({
            currentView,
            selectedFolderId,
            selectedNoteId: noteId,
          }),
          "",
        );
      }
    },
    [viewDispatch, isPhone, currentView, selectedFolderId],
  );

  const handleEditorChange = (value: string) => {
    if (currentView === selectedView.SCRATCHPAD) {
      scratchpad.setValue(value);
    } else if (effectiveSelectedNoteId) {
      updateNoteText(effectiveSelectedNoteId, value);
    }
  };

  const handleEditorBack = () => {
    if (isPhone) history.back();
  };

  const handleEditorTrash = () => {
    if (effectiveSelectedNoteId) {
      deleteNotes([effectiveSelectedNoteId]);
      if (isPhone) {
        history.back();
      } else {
        viewDispatch({ type: "noteSelect", noteId: null });
      }
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
      // Keep the current history entry in sync so a folder entry pushed on a
      // phone does not stay orphaned after the folder is gone.
      if (isPhone && folderToDelete.id === selectedFolderId) {
        history.replaceState(
          phoneHistoryState({
            currentView,
            selectedFolderId: null,
            selectedNoteId: null,
          }),
          "",
        );
      }
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
    const shouldClearFolder =
      isPhone &&
      view === selectedView.FOLDERS &&
      currentView === selectedView.FOLDERS &&
      Boolean(selectedFolderId);
    const nextFolderId = shouldClearFolder ? null : selectedFolderId;

    if (shouldClearFolder) {
      viewDispatch({ type: "clearFolderSelection" });
    }
    viewDispatch({ type: "viewChange", view });
    viewDispatch({ type: "noteSelect", noteId: null });
    if (isPhone) {
      const state = phoneHistoryState({
        currentView: view,
        selectedFolderId: nextFolderId,
        selectedNoteId: null,
      });
      if (view === selectedView.SCRATCHPAD && currentView !== view) {
        history.pushState(state, "");
      } else {
        history.replaceState(state, "");
      }
    }
    setSearchQuery("");
    closeMobileMenu();
  };

  const handleFolderBack = () => {
    history.back();
  };

  const handleFolderSelect = (folderId: string) => {
    viewDispatch({ type: "folderSelect", folderId });
    viewDispatch({ type: "noteSelect", noteId: null });
    if (isPhone) {
      history.pushState(
        phoneHistoryState({
          currentView: selectedView.FOLDERS,
          selectedFolderId: folderId,
          selectedNoteId: null,
        }),
        "",
      );
    }
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
      {isTablet && (
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
      {isPhone && !showEditorOnPhone && (
        <div className="mainView__phoneToolbar" data-testid="phone-top-bar">
          {showFolderBack && (
            <IconButton
              aria-label="Back to folders"
              onClick={handleFolderBack}
              edge="start"
              size="small"
              sx={{ mr: 0.5 }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 600 }}>
            {viewTitle}
          </Typography>
          {Boolean(user) && offline && (
            <Chip label="Offline" size="small" color="warning" sx={{ mr: 1 }} />
          )}
          <IconButton
            aria-label="Account"
            onClick={(e) => setAccountAnchor(e.currentTarget)}
            size="small"
          >
            <PersonIcon />
          </IconButton>
          <Menu
            anchorEl={accountAnchor}
            open={Boolean(accountAnchor)}
            onClose={() => setAccountAnchor(null)}
          >
            {user?.email && <MenuItem disabled>{user.email}</MenuItem>}
            {!user && (
              <MenuItem disabled>
                Notes are stored in this browser only.
              </MenuItem>
            )}
            <MenuItem
              onClick={() => {
                setAccountAnchor(null);
                if (user) {
                  dialogDispatch({ type: "openSignOut" });
                } else {
                  void signIn();
                }
              }}
            >
              {user ? "Sign out" : "Sign in with Google"}
            </MenuItem>
          </Menu>
        </div>
      )}
      {isTablet && (
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
      <Grid
        container
        spacing={0}
        sx={{ gap: 3 }}
        className="mainView__gridContainer"
      >
        {!isBelowDesktop && (
          <Grid sx={{ width: 300 }}>
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
        {showList && (
          <Grid
            sx={{
              maxWidth: isPhone ? "100%" : 400,
              minWidth: 0,
              flex: isPhone ? "1 1 100%" : undefined,
            }}
            className="mainView__middlePanel"
            gap={1}
            padding={1}
            paddingX={0}
          >
            {showFolderList ? (
              <FolderList
                folders={folders}
                onFolderSelect={handleFolderSelect}
                onAddFolder={() => dialogDispatch({ type: "openCreateFolder" })}
                onRenameFolder={(folder) =>
                  dialogDispatch({ type: "openRenameFolder", folder })
                }
                onDeleteFolder={(folder) =>
                  dialogDispatch({ type: "openDeleteFolder", folder })
                }
              />
            ) : (
              <>
                {isSearchable && (
                  <SearchNotesField
                    value={searchQuery}
                    onChange={setSearchQuery}
                    sticky={isPhone}
                  />
                )}
                <FolderView
                  loading={loading}
                  currentView={currentView}
                  notes={listedNotes}
                  folders={folders}
                  selectedNoteId={
                    isPhone ? selectedNoteId : effectiveSelectedNoteId
                  }
                  searchQuery={searchQuery}
                  signedOut={!user}
                  compact={isPhone}
                  onFavNote={addFavorite}
                  onTrashNote={handleTrashNote}
                  onMoveNoteToFolder={moveNoteToFolder}
                  onRestoreNote={restoreNote}
                  onCardSelect={handleNoteSelect}
                  onEmptyTrash={() =>
                    dialogDispatch({ type: "openEmptyTrash" })
                  }
                  onHideNote={hideNote}
                  onNewNote={handleNewNote}
                />
              </>
            )}
          </Grid>
        )}
        {showEditor && (
          <NoteEditorPanel
            loading={loading}
            currentView={currentView}
            scratchpadValue={scratchpad.value}
            selectedNote={selectedNote}
            effectiveSelectedNoteId={effectiveSelectedNoteId}
            onChange={handleEditorChange}
            isPhone={isPhone}
            onBack={handleEditorBack}
            editorTitle={editorTitle}
            onTrash={
              currentView !== selectedView.TRASH && effectiveSelectedNoteId
                ? handleEditorTrash
                : undefined
            }
          />
        )}
      </Grid>
      {isPhone && !showEditorOnPhone && (
        <BottomNav currentView={currentView} onViewChange={handleViewChange} />
      )}
      {isPhone && !showEditorOnPhone && currentView !== selectedView.TRASH && (
        <FabNewNote onClick={handleNewNote} visible={true} />
      )}
      <CreateFolderDialog
        isOpen={openCreateFolder}
        fullScreen={isPhone}
        onAddFolder={addFolder}
        onClose={() => dialogDispatch({ type: "closeCreateFolder" })}
      />
      <DeleteFolderDialog
        isOpen={openDeleteFolder}
        fullScreen={isPhone}
        folderName={folderToDelete?.name}
        noteCount={folderNoteCount}
        onDeleteFolder={handleConfirmDeleteFolder}
        onClose={() => dialogDispatch({ type: "closeDeleteFolder" })}
      />
      <EmptyTrashDialog
        isOpen={openEmptyTrash}
        fullScreen={isPhone}
        onEmptyTrash={handleEmptyTrash}
        onClose={() => dialogDispatch({ type: "closeEmptyTrash" })}
      />
      <RenameFolderDialog
        key={
          folderToRename ? `${folderToRename.id}:${openRenameFolder}` : "closed"
        }
        isOpen={openRenameFolder}
        fullScreen={isPhone}
        initialName={folderToRename?.name ?? ""}
        onRename={handleRenameFolder}
        onClose={() => dialogDispatch({ type: "closeRenameFolder" })}
      />
      <SignOutDialog
        isOpen={openSignOut}
        fullScreen={isPhone}
        onConfirm={handleConfirmSignOut}
        onClose={() => dialogDispatch({ type: "closeSignOut" })}
      />
    </div>
  );
};

export default MainView;
