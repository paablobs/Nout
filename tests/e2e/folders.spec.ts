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

test("create a folder via dialog", async ({ page }) => {
  await page.locator(testId("nav-add-folder")).click();

  await expect(page.locator(testId("create-folder-dialog"))).toBeVisible();

  await page.getByLabel("Folder Name").fill("My Folder");
  await page.locator(testId("create-folder-submit")).click();

  await expect(page.locator(testId("create-folder-dialog"))).not.toBeVisible();

  await expect(page.locator(testId("folder-btn-My Folder"))).toBeVisible();
});

test("cancel folder creation does not create folder", async ({ page }) => {
  await page.locator(testId("nav-add-folder")).click();

  await page.getByLabel("Folder Name").fill("Canceled Folder");
  await page.locator(testId("create-folder-cancel")).click();

  await expect(
    page.locator(testId("folder-btn-Canceled Folder")),
  ).not.toBeVisible();
});

test("delete a folder via dialog", async ({ page }) => {
  await seedLocalStorage(page, {
    folders: [makeFolder({ id: "folder-1", name: "To Delete" })],
  });
  await page.goto("/");

  await page.locator(testId("delete-folder-To Delete")).click();

  await expect(page.locator(testId("delete-folder-dialog"))).toBeVisible();
  await page.locator(testId("delete-folder-confirm")).click();

  await expect(page.locator(testId("folder-btn-To Delete"))).not.toBeVisible();
});

test("cancel folder deletion does not delete folder", async ({ page }) => {
  await seedLocalStorage(page, {
    folders: [makeFolder({ id: "folder-1", name: "Keep me" })],
  });
  await page.goto("/");

  await page.locator(testId("delete-folder-Keep me")).click();
  await page.locator(testId("delete-folder-cancel")).click();

  await expect(page.locator(testId("folder-btn-Keep me"))).toBeVisible();
});

test("move a note to a folder", async ({ page }) => {
  const noteId = crypto.randomUUID();
  await seedLocalStorage(page, {
    notes: { [noteId]: makeNote({ id: noteId, text: "Move me" }) },
    folders: [makeFolder({ id: "folder-1", name: "Target Folder" })],
  });
  await page.goto("/");

  await page.locator(testId(`move-folder-btn-${noteId}`)).click();
  await page.locator(testId("move-to-folder-Target Folder")).click();

  await page.locator(testId("folder-btn-Target Folder")).click();

  await expect(page.locator(testId(`note-card-${noteId}`))).toBeVisible();
});

test("deleting a folder trashes its notes", async ({ page }) => {
  const noteId = crypto.randomUUID();
  const folderId = crypto.randomUUID();
  await seedLocalStorage(page, {
    notes: {
      [noteId]: makeNote({
        id: noteId,
        text: "Folder note",
        folderId,
      }),
    },
    folders: [makeFolder({ id: folderId, name: "Folder to Delete" })],
  });
  await page.goto("/");

  await page.locator(testId("delete-folder-Folder to Delete")).click();
  await page.locator(testId("delete-folder-confirm")).click();

  await page.locator(testId("nav-trash")).click();
  await expect(page.locator(testId(`note-card-${noteId}`))).toBeVisible();
});
