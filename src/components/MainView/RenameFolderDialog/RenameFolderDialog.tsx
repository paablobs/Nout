import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@mui/material";
import { useState } from "react";

interface RenameFolderDialogProps {
  isOpen: boolean;
  initialName: string;
  onRename: (folderName: string) => void;
  onClose: () => void;
}

const RenameFolderDialog = ({
  isOpen,
  initialName,
  onRename,
  onClose,
}: RenameFolderDialogProps) => {
  const [folderName, setFolderName] = useState(initialName);
  const handleClose = () => {
    onClose();
    setFolderName(initialName);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onRename(folderName);
    handleClose();
  };

  return (
    <Dialog
      data-testid="rename-folder-dialog"
      open={isOpen}
      onClose={handleClose}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>Rename Folder</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter a new name for this folder.
          </DialogContentText>
          <TextField
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
            slotProps={{
              htmlInput: {
                "data-testid": "folder-rename-input",
                maxLength: 80,
              },
            }}
            onChange={(e) => setFolderName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button data-testid="rename-folder-cancel" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            data-testid="rename-folder-submit"
            type="submit"
            variant="contained"
            color="secondary"
          >
            Rename
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default RenameFolderDialog;
