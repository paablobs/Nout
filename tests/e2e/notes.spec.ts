import { test, expect } from "@playwright/test";
import {
  testId,
  clearLocalStorage,
  makeNote,
  seedLocalStorage,
  clickNav,
  openDrawerIfNeeded,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await clearLocalStorage(page);
});

test("create a new note", async ({ page, isMobile }) => {
  if (isMobile) {
    await page.locator(testId("notes-empty-state")).waitFor();
    await page.locator(testId("fab-new-note")).click();
    const editor = page
      .locator(testId("tiptap-editor"))
      .locator(".ProseMirror");
    await expect(editor).toBeVisible();
  } else {
    await openDrawerIfNeeded(page);
    await page.locator(testId("new-note-btn")).click();
    await expect(page.locator('[data-testid^="note-card-"]')).toHaveCount(1);
  }
});

test("edit a note via TipTap editor", async ({ page }) => {
  const noteId = crypto.randomUUID();
  await seedLocalStorage(page, {
    notes: { [noteId]: makeNote({ id: noteId }) },
  });
  await page.goto("/");
  await page.locator(testId(`note-card-${noteId}`)).click();
  const editor = page.locator(testId("tiptap-editor")).locator(".ProseMirror");
  await expect(editor).toBeVisible();
  await editor.fill("");
  await editor.type("My updated note content");
  await expect(editor).toContainText("My updated note content");
});

test("favorite a note toggles star", async ({ page }) => {
  const noteId = crypto.randomUUID();
  await seedLocalStorage(page, {
    notes: { [noteId]: makeNote({ id: noteId }) },
  });
  await page.goto("/");
  await page.locator(testId(`fav-btn-${noteId}`)).click();
  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem("notes");
    if (!raw) return null;
    return Object.values(JSON.parse(raw))[0] as { isFav: boolean };
  });
  expect(stored?.isFav).toBe(true);
});

test("move a note to trash", async ({ page }) => {
  const noteId = crypto.randomUUID();
  await seedLocalStorage(page, {
    notes: { [noteId]: makeNote({ id: noteId, text: "Trash me" }) },
  });
  await page.goto("/");
  await page.locator(testId(`trash-btn-${noteId}`)).click();
  await expect(page.locator(testId(`note-card-${noteId}`))).not.toBeVisible();
  await clickNav(page, "trash");
  await expect(page.locator(testId(`note-card-${noteId}`))).toBeVisible();
});

test("restore a note from trash", async ({ page }) => {
  const noteId = crypto.randomUUID();
  await seedLocalStorage(page, {
    notes: {
      [noteId]: makeNote({ id: noteId, text: "Restore me", isTrash: true }),
    },
  });
  await page.goto("/");
  await clickNav(page, "trash");
  await page.locator(testId(`restore-btn-${noteId}`)).click();
  await expect(page.locator(testId(`note-card-${noteId}`))).not.toBeVisible();
  await clickNav(page, "notes");
  await expect(page.locator(testId(`note-card-${noteId}`))).toBeVisible();
});

test("hide a note from Notes view", async ({ page, isMobile }) => {
  const noteId = crypto.randomUUID();
  const folderId = crypto.randomUUID();
  await seedLocalStorage(page, {
    notes: { [noteId]: makeNote({ id: noteId, text: "Hide me", folderId }) },
    folders: [{ id: folderId, name: "Custom", color: "#ff0000" }],
  });
  await page.goto("/");
  await page.locator(testId(`three-dot-btn-${noteId}`)).click();
  await page.locator(testId(`hide-note-${noteId}`)).click();
  await expect(page.locator(testId(`note-card-${noteId}`))).not.toBeVisible();
  if (isMobile) {
    await page.locator(testId("nav-folders")).click();
    await page.locator(testId("folder-list-item-Custom")).click();
  } else {
    await openDrawerIfNeeded(page);
    await page.locator(testId("folder-btn-Custom")).click();
  }
  await expect(page.locator(testId(`note-card-${noteId}`))).toBeVisible();
});
