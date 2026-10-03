import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot, setDoc, type Firestore } from "firebase/firestore";
import { useLocalStorage } from "./useLocalStorage";
import { useSession } from "../contexts/SessionContext";
import { useReportError } from "../contexts/ErrorContext";
import { db } from "../config/firebase";
import {
  shouldApplyCloudSnapshot,
  shouldRestoreCloudValue,
} from "../utils/cloudSync";

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
  const inFlightSaveRef = useRef<{ id: number; value: T } | null>(null);
  const saveIdRef = useRef(0);
  const confirmedSaveIdRef = useRef(0);
  const syncEpochRef = useRef(0);
  const confirmedValueRef = useRef(defaultValue);
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
    syncEpochRef.current += 1;
    const { firestorePath, serialize, deserialize, defaultValue } =
      configRef.current;

    seededRef.current = false;
    inFlightSaveRef.current = null;
    confirmedSaveIdRef.current = 0;
    confirmedValueRef.current = defaultValue;
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
      { includeMetadataChanges: true },
      (snapshot) => {
        if (cancelled) return;

        if (
          !shouldApplyCloudSnapshot(
            {
              exists: snapshot.exists(),
              fromCache: snapshot.metadata.fromCache,
            },
            pendingValueRef.current !== null ||
              inFlightSaveRef.current !== null,
          )
        ) {
          return;
        }

        setCloudLoading(false);
        if (snapshot.exists()) {
          const remoteValue = deserialize(
            (snapshot.data() as { value?: unknown }).value,
          );
          confirmedValueRef.current = remoteValue;
          setCloudValue(remoteValue);
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
      syncEpochRef.current += 1;
      cancelled = true;
      unsubscribe();
      inFlightSaveRef.current = null;
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
    const syncEpoch = syncEpochRef.current;
    pendingValueRef.current = next;
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      const pending = pendingValueRef.current;
      if (pending === null) return;
      pendingValueRef.current = null;
      const inFlightSave = { id: ++saveIdRef.current, value: pending };
      inFlightSaveRef.current = inFlightSave;
      setCloudValue(pending);
      void setDoc(ref, { value: serialize(pending) }, { merge: true })
        .then(() => {
          if (
            syncEpochRef.current === syncEpoch &&
            inFlightSave.id > confirmedSaveIdRef.current
          ) {
            confirmedSaveIdRef.current = inFlightSave.id;
            confirmedValueRef.current = pending;
          }
        })
        .catch((error) => {
          if (
            syncEpochRef.current === syncEpoch &&
            shouldRestoreCloudValue(
              inFlightSaveRef.current?.id ?? null,
              inFlightSave.id,
              pendingValueRef.current !== null,
            )
          ) {
            setCloudValue(confirmedValueRef.current);
          }
          console.error("Failed to update cloud data", error);
          reportError("Could not save to the cloud");
        })
        .finally(() => {
          if (inFlightSaveRef.current === inFlightSave) {
            inFlightSaveRef.current = null;
          }
        });
    }, SYNC_SAVE_DEBOUNCE_MS);
  };

  return {
    value: user ? cloudValue : localValue,
    setValue,
    loading: Boolean(user) && cloudLoading,
  };
}
