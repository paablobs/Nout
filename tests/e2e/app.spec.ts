import { test, expect } from "@playwright/test";
import {
  testId,
  clearLocalStorage,
  clickNav,
  openDrawerIfNeeded,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await clearLocalStorage(page);
});

test("renders the app title", async ({ page, isMobile }) => {
  if (isMobile) {
    await expect(
      page.getByRole("heading", { name: "Nout - Write stuff" }),
    ).toBeVisible();
  } else {
    await openDrawerIfNeeded(page);
    await expect(page.getByText("Nout", { exact: true })).toBeVisible();
  }
});

test("shows navigation items", async ({ page }) => {
  await openDrawerIfNeeded(page);
  await expect(page.locator(testId("nav-scratchpad"))).toBeVisible();
  await expect(page.locator(testId("nav-notes"))).toBeVisible();
  await expect(page.locator(testId("nav-favorites"))).toBeVisible();
  await expect(page.locator(testId("nav-trash"))).toBeVisible();
});

test("shows new note button", async ({ page, isMobile }) => {
  if (isMobile) {
    await expect(page.locator(testId("fab-new-note"))).toBeVisible();
  } else {
    await openDrawerIfNeeded(page);
    await expect(page.locator(testId("new-note-btn"))).toBeVisible();
  }
});

test("shows empty state for the notes view", async ({ page }) => {
  await expect(
    page.getByText("No notes on this device. Sign in to see your cloud notes."),
  ).toBeVisible();
});

test("shows empty state for favorites", async ({ page }) => {
  await clickNav(page, "favorites");
  await expect(page.getByText("Star a note to see it here.")).toBeVisible();
});

test("shows empty trash", async ({ page }) => {
  await clickNav(page, "trash");
  await expect(page.getByText("Trash is empty.")).toBeVisible();
});

test("shows local-only hint when signed out", async ({ page, isMobile }) => {
  if (isMobile) {
    await expect(page.locator('[aria-label="Account"]')).toBeVisible();
  } else {
    await openDrawerIfNeeded(page);
    await expect(page.locator(testId("local-only-hint"))).toBeVisible();
  }
});

test("recovers from malformed localStorage", async ({ page, isMobile }) => {
  await page.evaluate(() => localStorage.setItem("notes", "not-json"));
  await page.reload();
  if (isMobile) {
    await expect(
      page.getByRole("heading", { name: "Nout - Write stuff" }),
    ).toBeVisible();
  } else {
    await openDrawerIfNeeded(page);
    await expect(page.getByText("Nout", { exact: true })).toBeVisible();
  }
});
