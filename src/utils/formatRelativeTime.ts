const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;

export function formatRelativeTime(
  timestamp: number,
  now: number = Date.now(),
): string {
  if (!timestamp) return "";
  const elapsed = Math.max(0, now - timestamp);
  if (elapsed < MINUTE_MS) return "just now";
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)}m ago`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)}h ago`;
  if (elapsed < MONTH_MS) return `${Math.floor(elapsed / DAY_MS)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
