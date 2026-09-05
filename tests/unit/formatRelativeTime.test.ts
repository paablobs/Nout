import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "../../src/utils/formatRelativeTime";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
  const now = 10_000_000_000;

  it("returns empty for a missing timestamp", () => {
    expect(formatRelativeTime(0, now)).toBe("");
  });

  it("says just now under a minute", () => {
    expect(formatRelativeTime(now - 30_000, now)).toBe("just now");
  });

  it("uses minutes, hours, and days", () => {
    expect(formatRelativeTime(now - 5 * MINUTE, now)).toBe("5m ago");
    expect(formatRelativeTime(now - 3 * HOUR, now)).toBe("3h ago");
    expect(formatRelativeTime(now - 2 * DAY, now)).toBe("2d ago");
  });

  it("falls back to an absolute date after 30 days", () => {
    const timestamp = now - 31 * DAY;
    expect(formatRelativeTime(timestamp, now)).toBe(
      new Date(timestamp).toLocaleDateString(),
    );
  });

  it("never renders a future time as negative", () => {
    expect(formatRelativeTime(now + HOUR, now)).toBe("just now");
  });
});
