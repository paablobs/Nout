import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

interface EmptyTrashDialogProps {
  isOpen: boolean;
  onEmptyTrash: () => void;
  onClose: () => void;
}

const EmptyTrashDialog = ({
  isOpen,
  onEmptyTrash,
  onClose,
}: EmptyTrashDialogProps) => (
  <Dialog
    data-testid="empty-trash-dialog"
    open={isOpen}
    onClose={onClose}
    role="alertdialog"
  >
    <DialogTitle>Empty Trash</DialogTitle>
    <DialogContent>
      <DialogContentText>
        Are you sure you want to permanently delete all notes in the trash? This
        action cannot be undone.
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button data-testid="empty-trash-cancel" onClick={onClose}>
        Cancel
      </Button>
      <Button
        data-testid="empty-trash-confirm"
        onClick={onEmptyTrash}
        color="error"
        variant="contained"
      >
        Empty Trash
      </Button>
    </DialogActions>
  </Dialog>
);

export default EmptyTrashDialog;
