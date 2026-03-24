import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import SessionContext, { type Session } from "./contexts/SessionContext";
import MainView from "./components/MainView/MainView";
import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "./config/auth";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  let theme = createTheme({
    // Theme customization goes here as usual, including tonalOffset and/or
    // contrastThreshold as the augmentColor() function relies on these
  });

  theme = createTheme({
    palette: {
      mode: "dark",
      background: {
        default: "#0a0908",
      },
      secondary: theme.palette.augmentColor({
        color: {
          main: "#2e442e",
        },
      }),
      error: theme.palette.augmentColor({
        color: {
          main: "#942020",
        },
      }),
    },
    shape: {
      borderRadius: 8,
    },
    typography: {
      fontFamily: "'JetBrains Mono', monospace",
    },
    components: {
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderTopRightRadius: 24,
            borderBottomRightRadius: 24,
          },
        },
      },
      MuiDialog: {
        defaultProps: {
          slotProps: { paper: { elevation: 2 } },
        },
      },
      MuiMenu: {
        defaultProps: {
          elevation: 2,
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: "rgba(255, 255, 255, 0.03)",
          },
        },
      },
    },
  });

  const sessionContextValue = useMemo(
    () => ({
      session,
      setSession,
      loading,
    }),
    [session, loading],
  );

  useEffect(() => {
    // Returns an `unsubscribe` function to be called during teardown
    const unsubscribe = onAuthStateChanged((user: User | null) => {
      if (user) {
        setSession({
          user: {
            name: user.displayName || "",
            email: user.email || "",
          },
        });
      } else {
        setSession(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      <SessionContext.Provider value={sessionContextValue}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <MainView />
        </ThemeProvider>
      </SessionContext.Provider>
    </>
  );
}

export default App;
