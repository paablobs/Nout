import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

interface SignOutDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const SignOutDialog = ({ isOpen, onConfirm, onClose }: SignOutDialogProps) => (
  <Dialog data-testid="sign-out-dialog" open={isOpen} onClose={onClose}>
    <DialogTitle>Sign out</DialogTitle>
    <DialogContent>
      <DialogContentText>
        Your notes are safe in your account and will be there when you sign back
        in. Notes created before signing in stay on this device.
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button data-testid="sign-out-cancel" onClick={onClose}>
        Cancel
      </Button>
      <Button
        data-testid="sign-out-confirm"
        onClick={onConfirm}
        color="error"
        variant="contained"
      >
        Sign out
      </Button>
    </DialogActions>
  </Dialog>
);

export default SignOutDialog;
