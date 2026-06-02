import { Box, Button, List, ListItem, Skeleton } from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import { selectedView, type SelectedView } from "../../../utils/selectedView";
import CustomCard from "../../Card/Card";
import type { Note } from "../../../hooks/useNotes";

interface Folder {
  id: string;
  name: string;
  color?: string;
}

interface MiddlePanelProps {
  loading: boolean;
  currentView: SelectedView;
  notes: Record<string, Note>;
  folders: Folder[];
  selectedFolderId: string | null;
  selectedNoteId: string | null;
  onFavNote: (noteId: string) => void;
  onTrashNote: (noteId: string) => void;
  onMoveNoteToFolder: (noteId: string, folderId: string | null) => void;
  onRestoreNote: (noteId: string) => void;
  onCardSelect?: (noteId: string) => void;
  onEmptyTrash?: () => void;
  onHideNote: (noteId: string) => void;
}

const getViewAriaLabel = (
  currentView: SelectedView,
  selectedFolderId: string | null,
  folders: Folder[],
): string => {
  if (currentView === selectedView.SCRATCHPAD) return "Scratchpad";
  if (currentView === selectedView.NOTES) return "Notes";
  if (currentView === selectedView.FAVORITES) return "Favorite notes";
  if (currentView === selectedView.TRASH) return "Trash";
  if (currentView === selectedView.FOLDERS) {
    const folder = folders.find((f) => f.id === selectedFolderId);
    return folder ? `Folder: ${folder.name}` : "Folders";
  }
  return "Notes";
};

const FolderView = ({
  loading,
  currentView,
  notes,
  folders,
  selectedFolderId,
  selectedNoteId,
  onFavNote,
  onTrashNote,
  onMoveNoteToFolder,
  onRestoreNote,
  onCardSelect,
  onEmptyTrash,
  onHideNote,
}: MiddlePanelProps) => {
  if (loading) {
    return (
      <List aria-label="Loading notes" aria-busy={true} sx={{ width: "100%" }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <ListItem key={`notes-loading-${index}`} disablePadding>
            <Box padding={1} sx={{ width: "100%" }}>
              <Skeleton variant="rounded" height={82} />
            </Box>
          </ListItem>
        ))}
      </List>
    );
  }

  const listLabel = getViewAriaLabel(currentView, selectedFolderId, folders);

  return (
    <List
      aria-label={listLabel}
      aria-busy={false}
      sx={{ width: "100%", padding: 0 }}
    >
      {currentView === selectedView.NOTES &&
        Object.values(notes)
          .filter((card) => !card.isTrash && !card.isHidden)
          .map(
            (card) =>
              card && (
                <ListItem key={card.id} disablePadding>
                  <CustomCard
                    id={card.id}
                    text={card.text}
                    category={card.category}
                    isFav={card.isFav}
                    onFav={() => onFavNote(card.id)}
                    onTrash={() => onTrashNote(card.id)}
                    isHidden={card.isHidden}
                    onHide={() => onHideNote(card.id)}
                    onMoveToFolder={onMoveNoteToFolder}
                    folders={folders}
                    folderId={card.folderId}
                    onSelect={
                      onCardSelect ? () => onCardSelect(card.id) : undefined
                    }
                    selected={selectedNoteId === card.id}
                  />
                </ListItem>
              ),
          )}
      {currentView === selectedView.FAVORITES &&
        Object.values(notes)
          .filter((card) => card.isFav && !card.isTrash && !card.isHidden)
          .map(
            (card) =>
              card && (
                <ListItem key={card.id} disablePadding>
                  <CustomCard
                    id={card.id}
                    text={card.text}
                    category={card.category}
                    isFav={card.isFav}
                    onFav={() => onFavNote(card.id)}
                    onTrash={() => onTrashNote(card.id)}
                    isHidden={card.isHidden}
                    onHide={() => onHideNote(card.id)}
                    onMoveToFolder={onMoveNoteToFolder}
                    folders={folders}
                    folderId={card.folderId}
                    onSelect={
                      onCardSelect ? () => onCardSelect(card.id) : undefined
                    }
                    selected={selectedNoteId === card.id}
                  />
                </ListItem>
              ),
          )}
      {currentView === selectedView.FOLDERS &&
        selectedFolderId &&
        Object.values(notes)
          .filter((note) => note.folderId === selectedFolderId && !note.isTrash)
          .map(
            (card) =>
              card && (
                <ListItem key={card.id} disablePadding>
                  <CustomCard
                    id={card.id}
                    text={card.text}
                    category={card.category}
                    isFav={card.isFav}
                    onFav={() => onFavNote(card.id)}
                    onTrash={() => onTrashNote(card.id)}
                    isHidden={card.isHidden}
                    onHide={() => onHideNote(card.id)}
                    onMoveToFolder={onMoveNoteToFolder}
                    folders={folders}
                    folderId={card.folderId}
                    onSelect={
                      onCardSelect ? () => onCardSelect(card.id) : undefined
                    }
                    selected={selectedNoteId === card.id}
                  />
                </ListItem>
              ),
          )}
      {currentView === selectedView.TRASH && (
        <>
          <ListItem disablePadding>
            <Button
              data-testid="empty-trash-btn"
              onClick={onEmptyTrash}
              sx={{
                borderRadius: 1,
                textTransform: "none",
              }}
              color="error"
              fullWidth
              variant="contained"
              startIcon={<DeleteIcon aria-hidden="true" />}
              size="large"
            >
              Empty Trash
            </Button>
          </ListItem>
          {Object.values(notes)
            .filter((card) => card.isTrash)
            .map(
              (card) =>
                card && (
                  <ListItem key={card.id} disablePadding>
                    <CustomCard
                      id={card.id}
                      text={card.text}
                      category={card.category}
                      isTrash={card.isTrash}
                      onRestore={
                        onRestoreNote ? () => onRestoreNote(card.id) : undefined
                      }
                      onSelect={
                        onCardSelect ? () => onCardSelect(card.id) : undefined
                      }
                      selected={selectedNoteId === card.id}
                    />
                  </ListItem>
                ),
            )}
        </>
      )}
    </List>
  );
};

export default FolderView;
