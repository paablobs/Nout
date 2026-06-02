import { useEffect, useEffectEvent, useRef, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { db } from "../../../config/firebase";
import { useSession } from "../../../contexts/SessionContext";
import { useLocalStorage } from "../../../hooks/useLocalStorage";
import { storageKeys } from "../../../utils/storageKeys";
import { DEFAULT_SCRATCHPAD_CONTENT } from "../../../utils/constants";

const SCRATCHPAD_SAVE_DEBOUNCE_MS = 400;

export function useScratchpad() {
  const { user } = useSession();

  const [localValue, setLocalValue] = useLocalStorage<string>(
    storageKeys.SCRATCHPAD,
    DEFAULT_SCRATCHPAD_CONTENT,
  );
  const [cloudValue, setCloudValue] = useState(DEFAULT_SCRATCHPAD_CONTENT);
  const [loading, setLoading] = useState(false);
  const seededRef = useRef(false);

  const seedLocalToCloud = useEffectEvent(
    async (scratchpadRef: ReturnType<typeof doc>) => {
      setCloudValue(localValue);
      await setDoc(scratchpadRef, { value: localValue }, { merge: true });
    },
  );

  useEffect(() => {
    seededRef.current = false;

    if (!user || !db) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const cloudDb = db;
    const userId = user.uid;

    void (async () => {
      const scratchpadRef = doc(cloudDb, "users", userId, "meta", "scratchpad");

      setLoading(true);
      try {
        if (controller.signal.aborted) return;
        const scratchpadSnapshot = await getDoc(scratchpadRef);
        if (controller.signal.aborted || !scratchpadSnapshot) return;

        if (scratchpadSnapshot.exists()) {
          const loaded =
            (scratchpadSnapshot.data() as { value?: string }).value ??
            DEFAULT_SCRATCHPAD_CONTENT;
          setCloudValue(loaded);
        } else {
          await seedLocalToCloud(scratchpadRef);
        }

        if (controller.signal.aborted) return;
        seededRef.current = true;
      } catch (error) {
        console.error("Failed to load scratchpad", error);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [user]);

  useEffect(() => {
    if (!user || !db || !seededRef.current) return;

    const scratchpadRef = doc(db, "users", user.uid, "meta", "scratchpad");
    const timer = window.setTimeout(() => {
      void setDoc(scratchpadRef, { value: cloudValue }, { merge: true });
    }, SCRATCHPAD_SAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [user, cloudValue]);

  const value = user ? cloudValue : localValue;
  const setValue = user ? setCloudValue : setLocalValue;

  return { value, setValue, loading };
}
