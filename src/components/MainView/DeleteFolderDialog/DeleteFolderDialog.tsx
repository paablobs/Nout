import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

interface DeleteFolderDialogProps {
  isOpen: boolean;
  folderName: string | undefined;
  noteCount: number;
  onDeleteFolder: () => void;
  onClose: () => void;
}

const notesMessage = (noteCount: number): string => {
  if (noteCount === 0) return "No notes are inside this folder.";
  const noun = noteCount === 1 ? "note" : "notes";
  return `Its ${noteCount} ${noun} will be moved to Trash, where you can restore them.`;
};

const DeleteFolderDialog = ({
  isOpen,
  folderName,
  noteCount,
  onDeleteFolder,
  onClose,
}: DeleteFolderDialogProps) => (
  <Dialog data-testid="delete-folder-dialog" open={isOpen} onClose={onClose}>
    <DialogTitle>Delete Folder</DialogTitle>
    <DialogContent>
      <DialogContentText>
        {`Are you sure you want to delete the folder "${folderName ?? ""}"? ${notesMessage(noteCount)}`}
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button data-testid="delete-folder-cancel" onClick={onClose}>
        Cancel
      </Button>
      <Button
        data-testid="delete-folder-confirm"
        onClick={onDeleteFolder}
        color="error"
        variant="contained"
      >
        Delete
      </Button>
    </DialogActions>
  </Dialog>
);

export default DeleteFolderDialog;
