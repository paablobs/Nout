import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot, setDoc, type Firestore } from "firebase/firestore";
import { useLocalStorage } from "./useLocalStorage";
import { useSession } from "../contexts/SessionContext";
import { useReportError } from "../contexts/ErrorContext";
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
  const reportError = useReportError();

  const [localValue, setLocalValue] = useLocalStorage<T>(
    storageKey,
    defaultValue,
  );
  const [cloudValue, setCloudValue] = useState<T>(defaultValue);
  const [cloudLoading, setCloudLoading] = useState(false);
  const seededRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const pendingValueRef = useRef<T | null>(null);
  const localValueRef = useRef(localValue);
  localValueRef.current = localValue;
  const configRef = useRef({
    firestorePath,
    serialize,
    deserialize,
    defaultValue,
  });
  configRef.current = { firestorePath, serialize, deserialize, defaultValue };

  useEffect(() => {
    const { firestorePath, serialize, deserialize, defaultValue } =
      configRef.current;

    seededRef.current = false;
    setCloudValue(defaultValue);

    if (!user || !db) {
      setCloudLoading(false);
      return;
    }

    const { db: cloudDb, docPath } = firestorePath(user.uid);
    const ref = doc(cloudDb, docPath);
    let cancelled = false;

    const flushPendingSave = () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      const pending = pendingValueRef.current;
      if (pending === null) return;
      pendingValueRef.current = null;
      void setDoc(ref, { value: serialize(pending) }, { merge: true }).catch(
        (error) => {
          console.error("Failed to flush cloud data", error);
          reportError("Could not save your latest changes to the cloud");
        },
      );
    };

    setCloudLoading(true);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (cancelled) return;
        setCloudLoading(false);
        if (snapshot.exists()) {
          setCloudValue(
            deserialize((snapshot.data() as { value?: unknown }).value),
          );
        } else if (!seededRef.current) {
          seededRef.current = true;
          void setDoc(
            ref,
            { value: serialize(localValueRef.current) },
            {
              merge: true,
            },
          ).catch((error) => {
            console.error("Failed to seed cloud data", error);
            reportError("Could not copy your local data to the cloud");
          });
        }
      },
      (error) => {
        if (cancelled) return;
        setCloudLoading(false);
        console.error("Failed to load cloud data", error);
        reportError("Could not load your cloud data");
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
      flushPendingSave();
    };
  }, [user, reportError]);

  const setValue = (next: T) => {
    if (!user || !db) {
      setLocalValue(next);
      return;
    }
    const { firestorePath, serialize } = configRef.current;
    const { db: cloudDb, docPath } = firestorePath(user.uid);
    const ref = doc(cloudDb, docPath);
    pendingValueRef.current = next;
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      const pending = pendingValueRef.current;
      if (pending === null) return;
      pendingValueRef.current = null;
      void setDoc(ref, { value: serialize(pending) }, { merge: true }).catch(
        (error) => {
          console.error("Failed to update cloud data", error);
          reportError("Could not save to the cloud");
        },
      );
    }, SYNC_SAVE_DEBOUNCE_MS);
  };

  return {
    value: user ? cloudValue : localValue,
    setValue,
    loading: Boolean(user) && cloudLoading,
  };
}
