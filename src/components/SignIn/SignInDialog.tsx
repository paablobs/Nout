import { Dialog, DialogContent } from "@mui/material";
import { AppProvider } from "@toolpad/core/AppProvider";
import {
  browserSessionPersistence,
  setPersistence,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "../../config/firebase";
import type { AuthProvider, AuthResponse } from "@toolpad/core/SignInPage";
import ThemeSignInPage from "./ThemeSignIn";

interface AuthProps {
  isOpen: boolean;
  onClose: () => void;
}

const SignInDialog = ({ isOpen, onClose }: AuthProps) => {
  const handleClose = () => {
    onClose();
  };

  const handleSignIn = async (
    provider: AuthProvider,
  ): Promise<AuthResponse> => {
    try {
      if (provider.id !== "google") {
        return { error: "Only Google sign-in is supported" };
      }

      await setPersistence(auth, browserSessionPersistence);
      await signInWithPopup(auth, googleProvider);

      // Successfully signed in, close the dialog
      onClose();

      return {};
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to sign in with Google";
      return {
        error: errorMessage,
      };
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose}>
      <DialogContent>
        <AppProvider>
          <ThemeSignInPage signIn={handleSignIn} />
        </AppProvider>
      </DialogContent>
    </Dialog>
  );
};

export default SignInDialog;
