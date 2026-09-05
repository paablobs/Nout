import { Box, Button, ListItem, Skeleton, Typography } from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import type { ReactNode } from "react";
import { selectedView, type SelectedView } from "../../../utils/selectedView";
import type { Note } from "../../../repositories/types";
import CustomCard from "../../Card/Card";

interface Folder {
  id: string;
  name: string;
  color?: string;
}

interface MiddlePanelProps {
  loading: boolean;
  currentView: SelectedView;
  notes: Note[];
  folders: Folder[];
  selectedNoteId: string | null;
  searchQuery: string;
  signedOut: boolean;
  onFavNote: (noteId: string) => void;
  onTrashNote: (noteId: string) => void;
  onMoveNoteToFolder: (noteId: string, folderId: string | null) => void;
  onRestoreNote: (noteId: string) => void;
  onCardSelect?: (noteId: string) => void;
  onEmptyTrash?: () => void;
  onHideNote: (noteId: string) => void;
  onNewNote: () => void;
}

const EmptyState = ({ text, action }: { text: string; action?: ReactNode }) => (
  <Box
    paddingX={2}
    paddingY={6}
    textAlign="center"
    data-testid="notes-empty-state"
  >
    <Typography color="text.secondary">{text}</Typography>
    {action ? <Box marginTop={2}>{action}</Box> : null}
  </Box>
);

const FolderView = ({
  loading,
  currentView,
  notes,
  folders,
  selectedNoteId,
  searchQuery,
  signedOut,
  onFavNote,
  onTrashNote,
  onMoveNoteToFolder,
  onRestoreNote,
  onCardSelect,
  onEmptyTrash,
  onHideNote,
  onNewNote,
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

  if (notes.length === 0) {
    if (searchQuery.trim()) {
      return <EmptyState text="No notes match your search." />;
    }
    switch (currentView) {
      case selectedView.NOTES:
        return (
          <EmptyState
            text={
              signedOut
                ? "No notes on this device. Sign in to see your cloud notes."
                : "No notes yet."
            }
            action={
              <Button data-testid="empty-state-new-note" onClick={onNewNote}>
                New note
              </Button>
            }
          />
        );
      case selectedView.FAVORITES:
        return <EmptyState text="Star a note to see it here." />;
      case selectedView.TRASH:
        return <EmptyState text="Trash is empty." />;
      case selectedView.FOLDERS:
        return (
          <EmptyState
            text="This folder is empty."
            action={
              <Button data-testid="empty-state-new-note" onClick={onNewNote}>
                New note
              </Button>
            }
          />
        );
      default:
        return null;
    }
  }

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
      {notes.map((card) => (
        <CustomCard
          key={card.id}
          id={card.id}
          text={card.text}
          isFav={card.isFav}
          isTrash={card.isTrash}
          isHidden={card.isHidden}
          updatedAt={card.updatedAt}
          trashedAt={card.trashedAt}
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
