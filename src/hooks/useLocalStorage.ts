import React from "react";
import {
  setLocalStorageItem,
  removeLocalStorageItem,
  getLocalStorageItem,
  useLocalStorageSubscribe,
  getLocalStorageServerSnapshot,
} from "../utils/localStorageHelper";

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const getSnapshot = () => getLocalStorageItem(key);

  const store = React.useSyncExternalStore(
    useLocalStorageSubscribe,
    getSnapshot,
    getLocalStorageServerSnapshot,
  );

  const setState = React.useCallback(
    (v: T | ((prev: T) => T)) => {
      try {
        const currentValue = store ? JSON.parse(store) : initialValue;
        const nextState =
          typeof v === "function" ? (v as (prev: T) => T)(currentValue) : v;

        if (nextState === undefined || nextState === null) {
          removeLocalStorageItem(key);
        } else {
          setLocalStorageItem(key, nextState);
        }
      } catch (e) {
        console.warn(e);
      }
    },
    [key, store, initialValue],
  );

  const seededRef = React.useRef(false);
  if (!seededRef.current) {
    seededRef.current = true;
    if (
      getLocalStorageItem(key) === null &&
      typeof initialValue !== "undefined"
    ) {
      setLocalStorageItem(key, initialValue);
    }
  }

  return [store ? (JSON.parse(store) as T) : initialValue, setState];
}
