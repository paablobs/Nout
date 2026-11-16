import { useCloudSync } from "./useCloudSync";
import { useLocalStorage } from "./useLocalStorage";
import { useSession } from "../contexts/SessionContext";
import { db } from "../config/firebase";
import { storageKeys } from "../utils/storageKeys";
import {
  DEFAULT_ACCENT,
  deserializeAccent,
  normalizeAccent,
  serializeAccent,
} from "../utils/accentTheme";

// The local key is always what the UI shows, so a pick applies instantly, the
// first paint never waits for the cloud, and a failed or offline cloud save
// keeps the user's choice. Signed in, useCloudSync only syncs it: edits are
// saved to the cloud doc, and a remote value (from another device or the first
// load) is written back to the local key from the snapshot handler.
//
// The value is undefined until an accent is picked: nothing is written on
// first load, and resetting to the default clears the key.
export function useThemeAccent(): [string, (accent: string) => void] {
  const { user } = useSession();
  const [accent, setLocalAccent] = useLocalStorage<string | undefined>(
    storageKeys.THEME_ACCENT,
    undefined,
  );
  const { setValue: saveToCloud } = useCloudSync<string | undefined>({
    storageKey: storageKeys.THEME_ACCENT,
    firestorePath: (userId) => ({
      db: db!,
      docPath: `users/${userId}/meta/theme`,
    }),
    defaultValue: undefined,
    serialize: serializeAccent,
    deserialize: deserializeAccent,
    onRemoteValue: setLocalAccent,
    // Don't create a doc for someone who never picked an accent: a default
    // doc would later override a real pick made on another device.
    shouldSeed: (local) => local !== undefined,
  });

  const setAccent = (next: string) => {
    const normalized = normalizeAccent(next);
    const value = normalized === DEFAULT_ACCENT ? undefined : normalized;
    setLocalAccent(value);
    if (user) saveToCloud(value);
  };

  return [normalizeAccent(accent), setAccent];
}
