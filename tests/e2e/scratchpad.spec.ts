import { test, expect } from "@playwright/test";
import {
  testId,
  clearLocalStorage,
  seedLocalStorage,
  clickNav,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await clearLocalStorage(page);
});

test("scratchpad editor is accessible and editable", async ({ page }) => {
  await clickNav(page, "scratchpad");

  const editor = page.locator(testId("tiptap-editor")).locator(".ProseMirror");
  await expect(editor).toBeVisible();

  await editor.fill("");
  await editor.type("Hello from Scratchpad!");
  await expect(editor).toContainText("Hello from Scratchpad!");
});

test("scratchpad content persists in localStorage", async ({ page }) => {
  await clickNav(page, "scratchpad");

  const editor = page.locator(testId("tiptap-editor")).locator(".ProseMirror");
  await editor.fill("");
  await editor.type("Persistent content");

  const stored = await page.evaluate(() => localStorage.getItem("scratchpad"));
  expect(stored).toContain("Persistent content");
});

test("scratchpad loads existing content from localStorage", async ({
  page,
}) => {
  await seedLocalStorage(page, {
    scratchpad: "Pre-seeded scratchpad content",
  });

  await page.goto("/");
  await clickNav(page, "scratchpad");

  const editor = page.locator(testId("tiptap-editor")).locator(".ProseMirror");
  await expect(editor).toContainText("Pre-seeded scratchpad content");
});
