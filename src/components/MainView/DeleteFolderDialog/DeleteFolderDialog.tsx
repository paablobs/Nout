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
  onDeleteFolder: () => void;
  onClose: () => void;
}

const DeleteFolderDialog = ({
  isOpen,
  folderName,
  onDeleteFolder,
  onClose,
}: DeleteFolderDialogProps) => (
  <Dialog
    data-testid="delete-folder-dialog"
    open={isOpen}
    onClose={onClose}
    role="alertdialog"
  >
    <DialogTitle>Delete Folder</DialogTitle>
    <DialogContent>
      <DialogContentText>
        {`Are you sure you want to delete the folder "${folderName ?? ""}"? This action cannot be undone.`}
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
