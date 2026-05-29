import { test, expect } from "@playwright/test";
import { testId, clearLocalStorage } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await clearLocalStorage(page);
});

test("renders the app title", async ({ page }) => {
  await expect(page.getByText("Nout")).toBeVisible();
});

test("shows all navigation items", async ({ page }) => {
  await expect(page.locator(testId("nav-scratchpad"))).toBeVisible();
  await expect(page.locator(testId("nav-notes"))).toBeVisible();
  await expect(page.locator(testId("nav-favorites"))).toBeVisible();
  await expect(page.locator(testId("nav-trash"))).toBeVisible();
  await expect(page.locator(testId("nav-add-folder"))).toBeVisible();
});

test("shows cloud auth button", async ({ page }) => {
  const cloudBtn = page.locator(testId("cloud-auth-btn"));
  await expect(cloudBtn).toBeVisible();
  await expect(cloudBtn).toContainText("Sign in with Google");
});

test("shows new note button by default", async ({ page }) => {
  await expect(page.locator(testId("new-note-btn"))).toBeVisible();
});

test("navigating to scratchpad hides new note button", async ({ page }) => {
  await page.locator(testId("nav-scratchpad")).click();
  await expect(page.locator(testId("new-note-btn"))).not.toBeVisible();
});

test("navigating to trash hides new note button", async ({ page }) => {
  await page.locator(testId("nav-trash")).click();
  await expect(page.locator(testId("new-note-btn"))).not.toBeVisible();
});
