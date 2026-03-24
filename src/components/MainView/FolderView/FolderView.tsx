import { Button, ListItem } from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import { selectedView, type SelectedView } from "../../../utils/selectedView";
import CustomCard from "../../Card/Card";
import type { Note } from "../../../hooks/useLocalStorageNotes";

interface Folder {
  id: string;
  name: string;
  color?: string;
}

interface MiddlePanelProps {
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
  return (
    <>
      {currentView === selectedView.NOTES &&
        Object.values(notes)
          .filter((card) => !card.isTrash && !card.isHidden)
          .map(
            (card) =>
              card && (
                <CustomCard
                  key={card.id}
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
              ),
          )}
      {currentView === selectedView.FAVORITES &&
        Object.values(notes)
          .filter((card) => card.isFav && !card.isTrash && !card.isHidden)
          .map(
            (card) =>
              card && (
                <CustomCard
                  key={card.id}
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
              ),
          )}
      {currentView === selectedView.FOLDERS &&
        selectedFolderId &&
        Object.values(notes)
          .filter((note) => note.folderId === selectedFolderId && !note.isTrash)
          .map(
            (card) =>
              card && (
                <CustomCard
                  key={card.id}
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
              ),
          )}
      {currentView === selectedView.TRASH && (
        <>
          <ListItem disablePadding>
            <Button
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
          {Object.values(notes)
            .filter((card) => card.isTrash)
            .map(
              (card) =>
                card && (
                  <CustomCard
                    key={card.id}
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
                ),
            )}
        </>
      )}
    </>
  );
};

export default FolderView;
