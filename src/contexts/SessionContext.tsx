/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth, signInToCloud } from "../config/auth";
import { firebaseEnabled } from "../config/firebase";

interface SessionContextValue {
  user: User | null;
  loading: boolean;
  firebaseEnabled: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export const SessionProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseEnabled);

  useEffect(() => {
    if (!auth || !firebaseEnabled) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      loading,
      firebaseEnabled,
      signIn: async () => {
        if (!firebaseEnabled) return;
        setLoading(true);
        try {
          await signInToCloud();
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
    [user, loading],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used inside SessionProvider");
  }

  return context;
};
