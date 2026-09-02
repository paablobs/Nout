import { test, expect } from "@playwright/test";
import { testId, clearLocalStorage } from "./helpers";

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
    await expect(page.getByText("Nout", { exact: true })).toBeVisible();
  }
});

test("shows navigation items", async ({ page }) => {
  await expect(page.locator(testId("nav-scratchpad"))).toBeVisible();
  await expect(page.locator(testId("nav-notes"))).toBeVisible();
  await expect(page.locator(testId("nav-favorites"))).toBeVisible();
  await expect(page.locator(testId("nav-trash"))).toBeVisible();
});

test("shows new note button", async ({ page, isMobile }) => {
  const btn = isMobile ? testId("fab-new-note") : testId("new-note-btn");
  await expect(page.locator(btn)).toBeVisible();
});

test("shows empty state for the notes view", async ({ page }) => {
  await expect(
    page.getByText("No notes on this device. Sign in to see your cloud notes."),
  ).toBeVisible();
});

test("shows empty state for favorites", async ({ page }) => {
  await page.locator(testId("nav-favorites")).click();
  await expect(page.getByText("Star a note to see it here.")).toBeVisible();
});

test("shows empty trash", async ({ page }) => {
  await page.locator(testId("nav-trash")).click();
  await expect(page.getByText("Trash is empty.")).toBeVisible();
});

test("shows local-only hint when signed out", async ({ page, isMobile }) => {
  if (isMobile) {
    await expect(page.locator('[aria-label="Account"]')).toBeVisible();
  } else {
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
    await expect(page.getByText("Nout", { exact: true })).toBeVisible();
  }
});
