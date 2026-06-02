function dispatchStorageEvent(key: string, value: string | null) {
  window.dispatchEvent(
    new StorageEvent("storage", {
      key,
      newValue: value,
      oldValue: null,
      storageArea: window.localStorage,
    }),
  );
}

export function setLocalStorageItem<T>(key: string, value: T): void {
  const stringifiedValue = JSON.stringify(value);
  window.localStorage.setItem(key, stringifiedValue);
  dispatchStorageEvent(key, stringifiedValue);
}

export function removeLocalStorageItem(key: string): void {
  window.localStorage.removeItem(key);
  dispatchStorageEvent(key, null);
}

export function getLocalStorageItem(key: string): string | null {
  return window.localStorage.getItem(key);
}

export function useLocalStorageSubscribe(callback: () => void): () => void {
  const listener = () => callback();
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}

export function getLocalStorageServerSnapshot(): never {
  throw new Error("useLocalStorage is a client-only hook");
}
