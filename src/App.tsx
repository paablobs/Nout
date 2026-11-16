import { useMemo } from "react";
import MainView from "./components/MainView/MainView";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { createNoutTheme } from "./theme";
import { useThemeAccent } from "./hooks/useThemeAccent";

function App() {
  const [accent] = useThemeAccent();
  const theme = useMemo(() => createNoutTheme(accent), [accent]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MainView />
    </ThemeProvider>
  );
}

export default App;
