import { test, expect } from "@playwright/test";
import {
  testId,
  clearLocalStorage,
  makeNote,
  makeFolder,
  seedLocalStorage,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await clearLocalStorage(page);
});

test("search filters notes in the current view", async ({ page }) => {
  const shoppingId = crypto.randomUUID();
  const recipeId = crypto.randomUUID();
  const workoutId = crypto.randomUUID();
  await seedLocalStorage(page, {
    notes: {
      [shoppingId]: makeNote({ id: shoppingId, text: "Shopping list: milk" }),
      [recipeId]: makeNote({ id: recipeId, text: "Pancake recipe" }),
      [workoutId]: makeNote({ id: workoutId, text: "Workout plan" }),
    },
  });
  await page.goto("/");

  await page.locator(testId("notes-search-input")).fill("recipe");

  await expect(page.locator(testId(`note-card-${recipeId}`))).toBeVisible();
  await expect(
    page.locator(testId(`note-card-${shoppingId}`)),
  ).not.toBeVisible();
  await expect(
    page.locator(testId(`note-card-${workoutId}`)),
  ).not.toBeVisible();
});

test("clearing the search restores the full list", async ({ page }) => {
  const noteA = crypto.randomUUID();
  const noteB = crypto.randomUUID();
  await seedLocalStorage(page, {
    notes: {
      [noteA]: makeNote({ id: noteA, text: "Alpha content" }),
      [noteB]: makeNote({ id: noteB, text: "Beta content" }),
    },
  });
  await page.goto("/");

  await page.locator(testId("notes-search-input")).fill("alpha");
  await expect(page.locator(testId(`note-card-${noteB}`))).not.toBeVisible();

  await page.locator(testId("notes-search-clear")).click();

  await expect(page.locator(testId(`note-card-${noteA}`))).toBeVisible();
  await expect(page.locator(testId(`note-card-${noteB}`))).toBeVisible();
});

test("search shows an empty state when nothing matches", async ({ page }) => {
  const noteA = crypto.randomUUID();
  await seedLocalStorage(page, {
    notes: { [noteA]: makeNote({ id: noteA, text: "Alpha content" }) },
  });
  await page.goto("/");

  await page.locator(testId("notes-search-input")).fill("zzz-no-match");

  await expect(page.getByText("No notes match your search.")).toBeVisible();
});

test("search does not surface hidden notes outside their folder", async ({
  page,
}) => {
  const noteId = crypto.randomUUID();
  const folderId = crypto.randomUUID();
  await seedLocalStorage(page, {
    notes: {
      [noteId]: makeNote({
        id: noteId,
        text: "secret project codename",
        isHidden: true,
        folderId,
      }),
    },
    folders: [makeFolder({ id: folderId, name: "Secrets" })],
  });
  await page.goto("/");

  await page.locator(testId("notes-search-input")).fill("codename");
  await expect(page.locator(testId(`note-card-${noteId}`))).not.toBeVisible();

  await page.locator(testId("folder-btn-Secrets")).click();
  await page.locator(testId("notes-search-input")).fill("codename");
  await expect(page.locator(testId(`note-card-${noteId}`))).toBeVisible();
});

test("search is not shown in the trash view", async ({ page }) => {
  await page.locator(testId("nav-trash")).click();
  await expect(page.locator(testId("notes-search-input"))).not.toBeVisible();
});
