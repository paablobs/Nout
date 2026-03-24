import {
  SignInPage,
  type AuthProvider,
  type AuthResponse,
} from "@toolpad/core/SignInPage";
import { useSession, type Session } from "../../contexts/SessionContext";
import { signInWithGoogle } from "../../config/auth";
import { LinearProgress } from "@mui/material";

interface ThemeSignInPageProps {
  onDialogClose?: () => void;
}

const providers = [{ id: "google", name: "Google" }];

const ThemeSignInPage = ({
  onDialogClose = () => {},
}: ThemeSignInPageProps) => {
  const { setSession, loading } = useSession();

  if (loading) {
    return <LinearProgress />;
  }

  const handleSignIn = async (
    provider: AuthProvider,
  ): Promise<AuthResponse> => {
    try {
      if (provider.id !== "google") {
        return { error: "Only Google sign-in is supported" };
      }

      const result = await signInWithGoogle();

      if (result?.success && result?.user) {
        // Convert Firebase user to Session format
        const userSession: Session = {
          user: {
            name: result.user.displayName || "",
            email: result.user.email || "",
          },
        };
        setSession(userSession);

        onDialogClose();
        return {};
      }
      onDialogClose();
      return { error: result?.error || "Failed to sign in" };
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
    <SignInPage
      signIn={handleSignIn}
      providers={providers}
      sx={{
        "& form > .MuiStack-root": {
          marginTop: "2rem",
          rowGap: "0.5rem",
        },
      }}
    />
  );
};

export default ThemeSignInPage;
