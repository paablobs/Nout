import MainView from "./components/MainView/MainView";
import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";

function App() {
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
      MuiCssBaseline: {
        styleOverrides: {
          "*:focus-visible": {
            outline: "2px solid #90caf9",
            outlineOffset: "2px",
          },
          "button:focus-visible, [role='button']:focus-visible": {
            outline: "2px solid #90caf9",
            outlineOffset: "2px",
          },
        },
      },
    },
  });

  return (
    <>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <MainView />
      </ThemeProvider>
    </>
  );
}

export default App;
