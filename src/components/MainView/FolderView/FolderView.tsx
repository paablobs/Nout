import { Box, Button, ListItem, Skeleton } from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import { selectedView, type SelectedView } from "../../../utils/selectedView";
import { filterNotes } from "../../../utils/filteredNotes";
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
      <>
        {Array.from({ length: 4 }).map((_, index) => (
          <Box key={`notes-loading-${index}`} padding={1}>
            <Skeleton variant="rounded" height={82} />
          </Box>
        ))}
      </>
    );
  }

  const visibleNotes = filterNotes(notes, currentView, selectedFolderId);

  return (
    <>
      {currentView === selectedView.TRASH && (
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
            startIcon={<DeleteIcon />}
            size="large"
          >
            Empty Trash
          </Button>
        </ListItem>
      )}
      {visibleNotes.map((card) => (
        <CustomCard
          key={card.id}
          id={card.id}
          text={card.text}
          category={card.category}
          isFav={card.isFav}
          isTrash={card.isTrash}
          isHidden={card.isHidden}
          onFav={() => onFavNote(card.id)}
          onTrash={() => onTrashNote(card.id)}
          onHide={() => onHideNote(card.id)}
          onMoveToFolder={onMoveNoteToFolder}
          onRestore={
            currentView === selectedView.TRASH
              ? () => onRestoreNote(card.id)
              : undefined
          }
          folders={folders}
          folderId={card.folderId}
          onSelect={onCardSelect ? () => onCardSelect(card.id) : undefined}
          selected={selectedNoteId === card.id}
        />
      ))}
    </>
  );
};

export default FolderView;
