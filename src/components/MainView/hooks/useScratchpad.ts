import { useCloudSync } from "../../../hooks/useCloudSync";
import { storageKeys } from "../../../utils/storageKeys";
import { DEFAULT_SCRATCHPAD_CONTENT } from "../../../utils/constants";
import { db } from "../../../config/firebase";

export function useScratchpad() {
  const { value, setValue, loading } = useCloudSync<string>({
    storageKey: storageKeys.SCRATCHPAD,
    firestorePath: (userId) => ({
      db: db!,
      docPath: `users/${userId}/meta/scratchpad`,
    }),
    defaultValue: DEFAULT_SCRATCHPAD_CONTENT,
  });

  return { value, setValue, loading };
}
