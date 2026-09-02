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

test("tapping a note opens a full-screen editor with back button", async ({
  page,
  isMobile,
}) => {
  const noteId = crypto.randomUUID();
  await seedLocalStorage(page, {
    notes: {
      [noteId]: makeNote({
        id: noteId,
        text: "<p>Drill down test</p>",
      }),
    },
  });
  await page.goto("/");

  await page.locator(testId(`note-card-${noteId}`)).click();

  const editor = page.locator(testId("tiptap-editor")).locator(".ProseMirror");
  await expect(editor).toBeVisible();

  if (isMobile) {
    const backBtn = page.locator('[aria-label="Back"]');
    await expect(backBtn).toBeVisible();

    await backBtn.click();
    await expect(page.locator(testId(`note-card-${noteId}`))).toBeVisible();
  }
});

test("bottom nav shows on phone", async ({ page, isMobile }) => {
  if (!isMobile) {
    test.skip();
  }

  await expect(page.locator(testId("bottom-nav"))).toBeVisible();
});

test("phone top bar shows view title and account icon", async ({
  page,
  isMobile,
}) => {
  if (!isMobile) {
    test.skip();
  }

  await expect(page.locator(testId("phone-top-bar"))).toBeVisible();
  await expect(page.locator('[aria-label="Account"]')).toBeVisible();
});

test("new note FAB is visible on phone in list views", async ({
  page,
  isMobile,
}) => {
  if (!isMobile) {
    test.skip();
  }

  await expect(page.locator(testId("fab-new-note"))).toBeVisible();
});

test("new note FAB is hidden in trash view on phone", async ({
  page,
  isMobile,
}) => {
  if (!isMobile) {
    test.skip();
  }

  await page.locator(testId("nav-trash")).click();
  await expect(page.locator(testId("fab-new-note"))).not.toBeVisible();
});

test("phone folders tab shows folder list", async ({ page, isMobile }) => {
  if (!isMobile) {
    test.skip();
  }

  await seedLocalStorage(page, {
    folders: [makeFolder({ id: "f1", name: "My Folder" })],
  });
  await page.goto("/");

  await page.locator(testId("nav-folders")).click();
  await expect(
    page.locator(testId("folder-list-item-My Folder")),
  ).toBeVisible();
});

test("search field is visible on phone in list views", async ({
  page,
  isMobile,
}) => {
  if (!isMobile) {
    test.skip();
  }

  await expect(page.locator(testId("notes-search-input"))).toBeVisible();
});

test("search field is hidden in scratchpad view", async ({
  page,
  isMobile,
}) => {
  if (!isMobile) {
    test.skip();
  }

  await page.locator(testId("nav-scratchpad")).click();
  await expect(page.locator(testId("notes-search-input"))).not.toBeVisible();
});

test("phone editor has AppBar with title and delete icon", async ({
  page,
  isMobile,
}) => {
  if (!isMobile) {
    test.skip();
  }

  const noteId = crypto.randomUUID();
  await seedLocalStorage(page, {
    notes: {
      [noteId]: makeNote({
        id: noteId,
        text: "<p>AppBar test</p>",
      }),
    },
  });
  await page.goto("/");

  await page.locator(testId(`note-card-${noteId}`)).click();

  await expect(page.locator('[aria-label="Back"]')).toBeVisible();
  await expect(page.locator('[aria-label="Delete note"]')).toBeVisible();
});

test("hamburger menu is hidden on phone", async ({ page, isMobile }) => {
  if (!isMobile) {
    test.skip();
  }

  await expect(
    page.locator('[aria-label="Open navigation menu"]'),
  ).not.toBeVisible();
});
