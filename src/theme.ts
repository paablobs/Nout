import { createTheme, type Theme } from "@mui/material";
import {
  BACKGROUND_COLOR,
  DEFAULT_ACCENT,
  DEFAULT_SECONDARY,
  derivePalette,
} from "./utils/accentTheme";

export const BREAKPOINT_PHONE = 768;
export const BREAKPOINT_TABLET = 1024;

// The theme is built in two passes on purpose: augmentColor() only exists on a
// Theme instance, so a throwaway base theme is created first to borrow its
// palette helpers for the secondary and error colors.
export const createNoutTheme = (accent: string = DEFAULT_ACCENT): Theme => {
  const base = createTheme();
  const accentPalette = derivePalette(accent);

  return createTheme({
    breakpoints: {
      values: {
        xs: 0,
        sm: BREAKPOINT_PHONE,
        md: BREAKPOINT_TABLET,
        lg: 1200,
        xl: 1536,
      },
    },
    palette: {
      mode: "dark",
      background: {
        default: BACKGROUND_COLOR,
      },
      // With the default accent, primary and info are left unset so MUI's own
      // dark palette applies and the look is unchanged.
      // The Google sign-in button is the only "info" element and should
      // follow a custom accent, so info mirrors primary then.
      ...(accentPalette && {
        primary: base.palette.augmentColor({
          color: { main: accentPalette.primary },
        }),
        info: base.palette.augmentColor({
          color: { main: accentPalette.primary },
        }),
      }),
      secondary: base.palette.augmentColor({
        color: {
          main: accentPalette?.secondary ?? DEFAULT_SECONDARY,
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
