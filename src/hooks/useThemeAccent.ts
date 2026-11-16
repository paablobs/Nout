import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { storageKeys } from "../utils/storageKeys";
import { DEFAULT_ACCENT, normalizeAccent } from "../utils/accentTheme";

// The stored value is undefined until the user picks an accent: no seeding
// write on first load, and resetting to the default removes the key.
export function useThemeAccent(): [string, (accent: string) => void] {
  const [stored, setStored] = useLocalStorage<string | undefined>(
    storageKeys.THEME_ACCENT,
    undefined,
  );

  const setAccent = useCallback(
    (accent: string) => {
      const normalized = normalizeAccent(accent);
      setStored(normalized === DEFAULT_ACCENT ? undefined : normalized);
    },
    [setStored],
  );

  return [normalizeAccent(stored), setAccent];
}
