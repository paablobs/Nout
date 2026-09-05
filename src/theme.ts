import { createTheme, type Theme } from "@mui/material";

// The theme is built in two passes on purpose: augmentColor() only exists on a
// Theme instance, so a throwaway base theme is created first to borrow its
// palette helpers for the secondary and error colors.
const createNoutTheme = (): Theme => {
  const base = createTheme();

  return createTheme({
    palette: {
      mode: "dark",
      background: {
        default: "#0a0908",
      },
      secondary: base.palette.augmentColor({
        color: {
          main: "#2e442e",
        },
      }),
      error: base.palette.augmentColor({
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
};

export const noutTheme = createNoutTheme();
