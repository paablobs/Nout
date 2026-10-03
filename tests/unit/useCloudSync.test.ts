import { describe, expect, it } from "vitest";
import {
  shouldApplyCloudSnapshot,
  shouldRestoreCloudValue,
} from "../../src/utils/cloudSync";

describe("shouldApplyCloudSnapshot", () => {
  it("waits for the server before treating a cached missing document as absent", () => {
    expect(
      shouldApplyCloudSnapshot({ exists: false, fromCache: true }, false),
    ).toBe(false);
  });

  it("applies a server-confirmed missing document so it can be seeded", () => {
    expect(
      shouldApplyCloudSnapshot({ exists: false, fromCache: false }, false),
    ).toBe(true);
  });

  it("keeps a local edit visible while its debounced save is unsettled", () => {
    expect(
      shouldApplyCloudSnapshot({ exists: true, fromCache: false }, true),
    ).toBe(false);
  });

  it("applies an existing remote document when no local edit is pending", () => {
    expect(
      shouldApplyCloudSnapshot({ exists: true, fromCache: true }, false),
    ).toBe(true);
  });
});

describe("shouldRestoreCloudValue", () => {
  it("restores after the active save fails", () => {
    expect(shouldRestoreCloudValue(7, 7, false)).toBe(true);
  });

  it("does not restore when a newer local edit is pending", () => {
    expect(shouldRestoreCloudValue(7, 7, true)).toBe(false);
  });

  it("does not restore when an older save fails after a newer save starts", () => {
    expect(shouldRestoreCloudValue(8, 7, false)).toBe(false);
  });
});
