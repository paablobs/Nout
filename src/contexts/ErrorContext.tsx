import {
  createContext,
  use,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { Alert, Snackbar } from "@mui/material";

interface ErrorContextValue {
  reportError: (message: string) => void;
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

const ERROR_DISPLAY_MS = 6000;

export const ErrorProvider = ({ children }: PropsWithChildren) => {
  const [message, setMessage] = useState<string | null>(null);

  const value = useMemo<ErrorContextValue>(
    () => ({ reportError: setMessage }),
    [],
  );

  return (
    <ErrorContext value={value}>
      {children}
      <Snackbar
        open={message !== null}
        autoHideDuration={ERROR_DISPLAY_MS}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setMessage(null)}
        >
          {message}
        </Alert>
      </Snackbar>
    </ErrorContext>
  );
};

export const useReportError = () => {
  const context = use(ErrorContext);

  if (!context) {
    throw new Error("useReportError must be used inside ErrorProvider");
  }

  return context.reportError;
};
