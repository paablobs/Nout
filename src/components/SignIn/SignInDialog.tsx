import { Dialog, DialogContent } from "@mui/material";
import ThemeSignInPage from "./ThemeSignIn";

interface AuthProps {
  isOpen: boolean;
  onClose: () => void;
}

const SignInDialog = ({ isOpen, onClose }: AuthProps) => {
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogContent>
        <ThemeSignInPage onDialogClose={onClose} />
      </DialogContent>
    </Dialog>
  );
};

export default SignInDialog;
