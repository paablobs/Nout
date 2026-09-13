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

test("browser forward reopens a note after navigating back", async ({
  page,
  isMobile,
}) => {
  if (!isMobile) {
    test.skip();
  }

  const noteId = crypto.randomUUID();
  await seedLocalStorage(page, {
    notes: { [noteId]: makeNote({ id: noteId, text: "Forward test" }) },
  });
  await page.goto("/");

  await page.locator(testId(`note-card-${noteId}`)).click();
  await expect(page.locator('[aria-label="Back"]')).toBeVisible();

  await page.goBack();
  await expect(page.locator(testId(`note-card-${noteId}`))).toBeVisible();

  await page.goForward();
  await expect(page.locator('[aria-label="Back"]')).toBeVisible();
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

test("compact note cards fit the 72px target height on phone", async ({
  page,
  isMobile,
}) => {
  if (!isMobile) {
    test.skip();
  }

  const noteId = crypto.randomUUID();
  await seedLocalStorage(page, {
    notes: {
      [noteId]: makeNote({ id: noteId, text: "Compact height check" }),
    },
  });
  await page.goto("/");

  const card = page.locator(testId(`note-card-${noteId}`));
  await expect(card).toBeVisible();
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeLessThanOrEqual(72);
});

test("folder drill-down has a back button returning to the folder list", async ({
  page,
  isMobile,
}) => {
  if (!isMobile) {
    test.skip();
  }

  await seedLocalStorage(page, {
    folders: [makeFolder({ id: "f1", name: "My Folder" })],
  });
  await page.goto("/");

  await page.locator(testId("nav-folders")).click();
  await page.locator(testId("folder-list-item-My Folder")).click();
  await expect(page.locator('[aria-label="Back to folders"]')).toBeVisible();

  await page.locator('[aria-label="Back to folders"]').click();
  await expect(
    page.locator(testId("folder-list-item-My Folder")),
  ).toBeVisible();
});

test("deleting a folder note returns to that folder", async ({
  page,
  isMobile,
}) => {
  if (!isMobile) {
    test.skip();
  }

  const folderId = "f1";
  const noteId = crypto.randomUUID();
  await seedLocalStorage(page, {
    folders: [makeFolder({ id: folderId, name: "My Folder" })],
    notes: {
      [noteId]: makeNote({ id: noteId, folderId, text: "Delete me" }),
    },
  });
  await page.goto("/");

  await page.locator(testId("nav-folders")).click();
  await page.locator(testId("folder-list-item-My Folder")).click();
  await page.locator(testId(`note-card-${noteId}`)).click();
  await page.locator('[aria-label="Delete note"]').click();

  await expect(page.locator('[aria-label="Back to folders"]')).toBeVisible();
  await expect(page.getByText("This folder is empty.")).toBeVisible();
});

test("re-tapping the folders tab exits the open folder", async ({
  page,
  isMobile,
}) => {
  if (!isMobile) {
    test.skip();
  }

  await seedLocalStorage(page, {
    folders: [makeFolder({ id: "f1", name: "My Folder" })],
  });
  await page.goto("/");

  await page.locator(testId("nav-folders")).click();
  await page.locator(testId("folder-list-item-My Folder")).click();
  await expect(page.locator('[aria-label="Back to folders"]')).toBeVisible();

  await page.locator(testId("nav-folders")).click();
  await expect(
    page.locator(testId("folder-list-item-My Folder")),
  ).toBeVisible();
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

test("hamburger menu does not exist", async ({ page }) => {
  await expect(page.locator('[aria-label="Open navigation menu"]')).toHaveCount(
    0,
  );
});
