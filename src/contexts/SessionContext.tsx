import {
  createContext,
  use,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import { auth, signInWithGoogle } from "../config/auth";
import { firebaseEnabled } from "../config/firebase";
import { useReportError } from "./ErrorContext";

interface SessionContextValue {
  user: User | null;
  loading: boolean;
  firebaseEnabled: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const initialLoading = (): boolean => {
  if (!auth || !firebaseEnabled) return false;
  return true;
};

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : "unknown error";

export const SessionProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(initialLoading);
  const reportError = useReportError();

  useEffect(() => {
    if (!auth || !firebaseEnabled) return;

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    void getRedirectResult(auth).catch((error) => {
      reportError(`Sign-in failed: ${describeError(error)}`);
    });

    return unsubscribe;
  }, [reportError]);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      loading,
      firebaseEnabled,
      signIn: async () => {
        if (!firebaseEnabled) return;
        setLoading(true);
        try {
          await signInWithGoogle();
        } catch (error) {
          reportError(`Sign-in failed: ${describeError(error)}`);
        } finally {
          setLoading(false);
        }
      },
      signOut: async () => {
        if (!auth) return;
        setLoading(true);
        try {
          await signOut(auth);
        } finally {
          setLoading(false);
        }
      },
    }),
    [user, loading, reportError],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
};

export const useSession = () => {
  const context = use(SessionContext);

  if (!context) {
    throw new Error("useSession must be used inside SessionProvider");
  }

  return context;
};
