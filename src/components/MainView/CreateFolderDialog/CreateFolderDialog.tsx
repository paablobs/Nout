import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  TextField,
  DialogActions,
  Button,
} from "@mui/material";
import { useState } from "react";

interface CreateFolderDialogProps {
  isOpen: boolean;
  onAddFolder: (folderName: string) => void;
  onClose: () => void;
}

const CreateFolderDialog = ({
  isOpen,
  onAddFolder,
  onClose,
}: CreateFolderDialogProps) => {
  const [folderName, setFolderName] = useState("");
  const handleClose = () => {
    onClose();
    setFolderName("");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onAddFolder(folderName);
    handleClose();
  };

  return (
    <Dialog
      data-testid="create-folder-dialog"
      open={isOpen}
      onClose={handleClose}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>Add Folder</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please enter the name for the new folder.
          </DialogContentText>
          <TextField
            data-testid="folder-name-input"
            autoFocus
            required
            margin="dense"
            id="folderName"
            name="folderName"
            label="Folder Name"
            type="text"
            fullWidth
            variant="standard"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button data-testid="create-folder-cancel" onClick={onClose}>
            Cancel
          </Button>
          <Button
            data-testid="create-folder-submit"
            type="submit"
            variant="contained"
            color="secondary"
          >
            Add
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateFolderDialog;
