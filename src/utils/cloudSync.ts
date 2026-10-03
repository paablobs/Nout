export interface CloudSnapshotState {
  exists: boolean;
  fromCache: boolean;
}

export function shouldApplyCloudSnapshot(
  snapshot: CloudSnapshotState,
  hasUnsettledLocalWrite: boolean,
): boolean {
  if (!snapshot.exists && snapshot.fromCache) return false;
  return !hasUnsettledLocalWrite;
}

export function shouldRestoreCloudValue(
  activeSaveId: number | null,
  failedSaveId: number,
  hasPendingValue: boolean,
): boolean {
  return activeSaveId === failedSaveId && !hasPendingValue;
}
