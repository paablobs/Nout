import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { SessionProvider } from "./contexts/SessionContext.tsx";
import { ErrorProvider } from "./contexts/ErrorContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorProvider>
      <SessionProvider>
        <App />
      </SessionProvider>
    </ErrorProvider>
  </StrictMode>,
);
