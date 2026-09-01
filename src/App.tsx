import MainView from "./components/MainView/MainView";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { noutTheme } from "./theme";

function App() {
  return (
    <ThemeProvider theme={noutTheme}>
      <CssBaseline />
      <MainView />
    </ThemeProvider>
  );
}

export default App;
