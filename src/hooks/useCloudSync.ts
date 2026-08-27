import { useEffect, useEffectEvent, useRef, useState } from "react";
import { doc, getDoc, setDoc, type Firestore } from "firebase/firestore";
import { useLocalStorage } from "./useLocalStorage";
import { useSession } from "../contexts/SessionContext";
import { db } from "../config/firebase";

const SYNC_SAVE_DEBOUNCE_MS = 400;

interface UseCloudSyncConfig<T> {
  storageKey: string;
  firestorePath: (userId: string) => { db: Firestore; docPath: string };
  defaultValue: T;
  serialize?: (value: T) => unknown;
  deserialize?: (data: unknown) => T;
}

export function useCloudSync<T>({
  storageKey,
  firestorePath,
  defaultValue,
  serialize = (v) => v,
  deserialize = (d) => d as T,
}: UseCloudSyncConfig<T>) {
  const { user } = useSession();

  const [localValue, setLocalValue] = useLocalStorage<T>(
    storageKey,
    defaultValue,
  );
  const [cloudValue, setCloudValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(false);
  const seededRef = useRef(false);

  const seedLocalToCloud = useEffectEvent(
    async (cloudDb: Firestore, docPath: string) => {
      setCloudValue(localValue);
      const ref = doc(cloudDb, docPath);
      await setDoc(ref, { value: serialize(localValue) }, { merge: true });
    },
  );

  useEffect(() => {
    seededRef.current = false;

    if (!user || !db) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const { db: cloudDb, docPath } = firestorePath(user.uid);

    void (async () => {
      const ref = doc(cloudDb, docPath);

      setLoading(true);
      try {
        if (controller.signal.aborted) return;
        const snapshot = await getDoc(ref);
        if (controller.signal.aborted || !snapshot) return;

        if (snapshot.exists()) {
          const loaded = deserialize(
            (snapshot.data() as { value?: unknown }).value,
          );
          setCloudValue(loaded);
        } else {
          await seedLocalToCloud(cloudDb, docPath);
        }

        if (controller.signal.aborted) return;
        seededRef.current = true;
      } catch (error) {
        console.error("Failed to load cloud data", error);
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

    const { db: cloudDb, docPath } = firestorePath(user.uid);
    const ref = doc(cloudDb, docPath);
    const timer = window.setTimeout(() => {
      void setDoc(ref, { value: serialize(cloudValue) }, { merge: true }).catch(
        (error) => {
          console.error("Failed to update cloud data", error);
        },
      );
    }, SYNC_SAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [user, cloudValue]);

  const value = user ? cloudValue : localValue;
  const setValue = user ? setCloudValue : setLocalValue;

  return { value, setValue, loading };
}
