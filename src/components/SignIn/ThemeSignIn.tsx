import {
  SignInPage,
  type AuthProvider,
  type AuthResponse,
} from "@toolpad/core/SignInPage";

interface ThemeSignInPageProps {
  signIn?: (provider: AuthProvider) => void | Promise<AuthResponse>;
}

const providers = [{ id: "google", name: "Google" }];

const defaultSignIn: (
  provider: AuthProvider,
) => Promise<AuthResponse> = async () => {
  return { error: "Sign in not configured" };
};

export default function ThemeSignInPage({
  signIn = defaultSignIn,
}: ThemeSignInPageProps) {
  return (
    <SignInPage
      signIn={signIn}
      providers={providers}
      slotProps={{
        form: { noValidate: true },
        submitButton: {
          color: "primary",
          variant: "contained",
        },
      }}
      sx={{
        "& form > .MuiStack-root": {
          marginTop: "2rem",
          rowGap: "0.5rem",
        },
      }}
    />
  );
}
