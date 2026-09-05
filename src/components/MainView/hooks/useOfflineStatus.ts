import { useSyncExternalStore } from "react";

const subscribe = (callback: () => void) => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
};

const getSnapshot = () => navigator.onLine;
const getServerSnapshot = () => true;

export function useOfflineStatus(): boolean {
  return !useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
