import { test, expect } from "@playwright/test";
import {
  testId,
  clearLocalStorage,
  makeNote,
  seedLocalStorage,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await clearLocalStorage(page);
});

test("empty trash permanently deletes notes", async ({ page }) => {
  const noteId1 = crypto.randomUUID();
  const noteId2 = crypto.randomUUID();
  await seedLocalStorage(page, {
    notes: {
      [noteId1]: makeNote({ id: noteId1, text: "Trash 1", isTrash: true }),
      [noteId2]: makeNote({ id: noteId2, text: "Trash 2", isTrash: true }),
    },
  });
  await page.goto("/");

  await page.locator(testId("nav-trash")).click();

  await expect(page.locator(testId(`note-card-${noteId1}`))).toBeVisible();
  await expect(page.locator(testId(`note-card-${noteId2}`))).toBeVisible();

  await page.locator(testId("empty-trash-btn")).click();

  await expect(page.locator(testId("empty-trash-dialog"))).toBeVisible();
  await page.locator(testId("empty-trash-confirm")).click();
  await expect(page.locator(testId("empty-trash-dialog"))).not.toBeVisible();

  await expect(page.locator(testId(`note-card-${noteId1}`))).not.toBeVisible();
  await expect(page.locator(testId(`note-card-${noteId2}`))).not.toBeVisible();
});

test("cancel empty trash keeps notes", async ({ page }) => {
  const noteId = crypto.randomUUID();
  await seedLocalStorage(page, {
    notes: {
      [noteId]: makeNote({ id: noteId, text: "Safe", isTrash: true }),
    },
  });
  await page.goto("/");

  await page.locator(testId("nav-trash")).click();
  await page.locator(testId("empty-trash-btn")).click();
  await page.locator(testId("empty-trash-cancel")).click();

  await expect(page.locator(testId(`note-card-${noteId}`))).toBeVisible();
});
