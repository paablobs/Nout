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

test("create a new note", async ({ page }) => {
  await page.locator(testId("new-note-btn")).click();

  const cards = page.locator('[data-testid^="note-card-"]');
  await expect(cards).toHaveCount(1);
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

  const favBtn = page.locator(testId(`fav-btn-${noteId}`));
  await favBtn.click();

  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem("notes");
    if (!raw) return null;
    const notes = JSON.parse(raw);
    return Object.values(notes)[0] as { isFav: boolean };
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

  const card = page.locator(testId(`note-card-${noteId}`));
  await expect(card).not.toBeVisible();

  await page.locator(testId("nav-trash")).click();
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

  await page.locator(testId("nav-trash")).click();

  await page.locator(testId(`restore-btn-${noteId}`)).click();

  await expect(page.locator(testId(`note-card-${noteId}`))).not.toBeVisible();

  await page.locator(testId("nav-notes")).click();
  await expect(page.locator(testId(`note-card-${noteId}`))).toBeVisible();
});

test("hide a note from Notes view", async ({ page }) => {
  const noteId = crypto.randomUUID();
  const folderId = crypto.randomUUID();
  await seedLocalStorage(page, {
    notes: {
      [noteId]: makeNote({
        id: noteId,
        text: "Hide me",
        category: "Custom",
        folderId,
      }),
    },
    folders: [{ id: folderId, name: "Custom", color: "#ff0000" }],
  });
  await page.goto("/");

  await page.locator(testId(`three-dot-btn-${noteId}`)).click();
  await page.locator(testId(`hide-note-${noteId}`)).click();

  await expect(page.locator(testId(`note-card-${noteId}`))).not.toBeVisible();
});
