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

test("favorites view shows only favorited notes", async ({ page }) => {
  const favNoteId = crypto.randomUUID();
  const normalNoteId = crypto.randomUUID();
  await seedLocalStorage(page, {
    notes: {
      [favNoteId]: makeNote({
        id: favNoteId,
        text: "Favorite note",
        isFav: true,
      }),
      [normalNoteId]: makeNote({
        id: normalNoteId,
        text: "Normal note",
        isFav: false,
      }),
    },
  });
  await page.goto("/");

  await page.locator(testId("nav-favorites")).click();

  await expect(page.locator(testId(`note-card-${favNoteId}`))).toBeVisible();
  await expect(
    page.locator(testId(`note-card-${normalNoteId}`)),
  ).not.toBeVisible();
});

test("unfavoriting a note removes it from favorites view", async ({ page }) => {
  const noteId = crypto.randomUUID();
  await seedLocalStorage(page, {
    notes: {
      [noteId]: makeNote({ id: noteId, text: "Unfavorite me", isFav: true }),
    },
  });
  await page.goto("/");

  await page.locator(testId("nav-favorites")).click();
  await expect(page.locator(testId(`note-card-${noteId}`))).toBeVisible();

  await page.locator(testId(`fav-btn-${noteId}`)).click();

  await expect(page.locator(testId(`note-card-${noteId}`))).not.toBeVisible();
});
