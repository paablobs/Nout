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

test("create a folder via dialog", async ({ page, isMobile }) => {
  if (isMobile) {
    await page.locator(testId("nav-folders")).click();
    await page.locator(testId("fab-new-note")).click();
  } else {
    await page.locator(testId("nav-add-folder")).click();
  }

  await expect(page.locator(testId("create-folder-dialog"))).toBeVisible();

  await page.getByLabel("Folder Name").fill("My Folder");
  await page.locator(testId("create-folder-submit")).click();

  await expect(page.locator(testId("create-folder-dialog"))).not.toBeVisible();

  if (isMobile) {
    await expect(
      page.locator(testId("folder-list-item-My Folder")),
    ).toBeVisible();
  } else {
    await expect(page.locator(testId("folder-btn-My Folder"))).toBeVisible();
  }
});

test("cancel folder creation does not create folder", async ({
  page,
  isMobile,
}) => {
  if (isMobile) {
    await page.locator(testId("nav-folders")).click();
    await page.locator(testId("fab-new-note")).click();
  } else {
    await page.locator(testId("nav-add-folder")).click();
  }

  await page.getByLabel("Folder Name").fill("Canceled Folder");
  await page.locator(testId("create-folder-cancel")).click();

  if (isMobile) {
    await expect(
      page.locator(testId("folder-list-item-Canceled Folder")),
    ).not.toBeVisible();
  } else {
    await expect(
      page.locator(testId("folder-btn-Canceled Folder")),
    ).not.toBeVisible();
  }
});

test("delete a folder via dialog", async ({ page, isMobile }) => {
  await seedLocalStorage(page, {
    folders: [makeFolder({ id: "folder-1", name: "To Delete" })],
  });
  await page.goto("/");

  if (isMobile) {
    await page.locator(testId("nav-folders")).click();
    await page.locator(testId(`folder-menu-To Delete`)).click();
    await page.locator(testId("folder-delete-option")).click();
  } else {
    await page.locator(testId("delete-folder-To Delete")).click();
  }

  await expect(page.locator(testId("delete-folder-dialog"))).toBeVisible();
  await page.locator(testId("delete-folder-confirm")).click();

  if (isMobile) {
    await expect(
      page.locator(testId("folder-list-item-To Delete")),
    ).not.toBeVisible();
  } else {
    await expect(
      page.locator(testId("folder-btn-To Delete")),
    ).not.toBeVisible();
  }
});

test("cancel folder deletion does not delete folder", async ({
  page,
  isMobile,
}) => {
  await seedLocalStorage(page, {
    folders: [makeFolder({ id: "folder-1", name: "Keep me" })],
  });
  await page.goto("/");

  if (isMobile) {
    await page.locator(testId("nav-folders")).click();
    await page.locator(testId(`folder-menu-Keep me`)).click();
    await page.locator(testId("folder-delete-option")).click();
  } else {
    await page.locator(testId("delete-folder-Keep me")).click();
  }
  await page.locator(testId("delete-folder-cancel")).click();

  if (isMobile) {
    await expect(
      page.locator(testId("folder-list-item-Keep me")),
    ).toBeVisible();
  } else {
    await expect(page.locator(testId("folder-btn-Keep me"))).toBeVisible();
  }
});

test("move a note to a folder", async ({ page, isMobile }) => {
  const noteId = crypto.randomUUID();
  await seedLocalStorage(page, {
    notes: { [noteId]: makeNote({ id: noteId, text: "Move me" }) },
    folders: [makeFolder({ id: "folder-1", name: "Target Folder" })],
  });
  await page.goto("/");

  if (isMobile) {
    await page.locator(testId(`three-dot-btn-${noteId}`)).click();
    await page.locator(testId(`move-folder-menu-${noteId}`)).click();
    await page.locator(testId("move-to-folder-Target Folder")).click();
  } else {
    await page.locator(testId(`move-folder-btn-${noteId}`)).click();
    await page.locator(testId("move-to-folder-Target Folder")).click();
  }

  if (isMobile) {
    await page.locator(testId("nav-folders")).click();
    await page.locator(testId("folder-list-item-Target Folder")).click();
  } else {
    await page.locator(testId("folder-btn-Target Folder")).click();
  }

  await expect(page.locator(testId(`note-card-${noteId}`))).toBeVisible();
});

test("deleting a folder trashes its notes", async ({ page, isMobile }) => {
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

  if (isMobile) {
    await page.locator(testId("nav-folders")).click();
    await page.locator(testId(`folder-menu-Folder to Delete`)).click();
    await page.locator(testId("folder-delete-option")).click();
  } else {
    await page.locator(testId("delete-folder-Folder to Delete")).click();
  }

  await expect(page.locator(testId("delete-folder-dialog"))).toContainText(
    "Its 1 note will be moved to Trash",
  );
  await page.locator(testId("delete-folder-confirm")).click();

  if (isMobile) {
    await page.locator(testId("nav-trash")).click();
  } else {
    await page.locator(testId("nav-trash")).click();
  }
  await expect(page.locator(testId(`note-card-${noteId}`))).toBeVisible();
});

test("rename a folder via dialog", async ({ page, isMobile }) => {
  await seedLocalStorage(page, {
    folders: [makeFolder({ id: "folder-1", name: "Old Name" })],
  });
  await page.goto("/");

  if (isMobile) {
    await page.locator(testId("nav-folders")).click();
    await page.locator(testId(`folder-menu-Old Name`)).click();
    await page.locator(testId("folder-rename-option")).click();
  } else {
    await page.locator(testId("rename-folder-Old Name")).click();
  }

  await expect(page.locator(testId("rename-folder-dialog"))).toBeVisible();
  await expect(page.locator(testId("folder-rename-input"))).toHaveValue(
    "Old Name",
  );

  await page.locator(testId("folder-rename-input")).fill("New Name");
  await page.locator(testId("rename-folder-submit")).click();

  await expect(page.locator(testId("rename-folder-dialog"))).not.toBeVisible();

  if (isMobile) {
    await expect(
      page.locator(testId("folder-list-item-New Name")),
    ).toBeVisible();
    await expect(
      page.locator(testId("folder-list-item-Old Name")),
    ).not.toBeVisible();
  } else {
    await expect(page.locator(testId("folder-btn-New Name"))).toBeVisible();
    await expect(page.locator(testId("folder-btn-Old Name"))).not.toBeVisible();
  }
});

test("renaming a folder updates the label on its note cards", async ({
  page,
  isMobile,
}) => {
  const noteId = crypto.randomUUID();
  await seedLocalStorage(page, {
    notes: {
      [noteId]: makeNote({
        id: noteId,
        text: "Labeled note",
        folderId: "folder-1",
      }),
    },
    folders: [makeFolder({ id: "folder-1", name: "Old Name" })],
  });
  await page.goto("/");

  if (isMobile) {
    await page.locator(testId("nav-folders")).click();
    await page.locator(testId("folder-list-item-Old Name")).click();
    await page.locator(testId("nav-notes")).click();
  } else {
    await page.locator(testId("rename-folder-Old Name")).click();
    await page.locator(testId("folder-rename-input")).fill("New Name");
    await page.locator(testId("rename-folder-submit")).click();
  }

  if (!isMobile) {
    await expect(page.locator(testId(`note-card-${noteId}`))).toContainText(
      "New Name",
    );
  }
});

test("cancel folder rename keeps the original name", async ({
  page,
  isMobile,
}) => {
  await seedLocalStorage(page, {
    folders: [makeFolder({ id: "folder-1", name: "Keep me" })],
  });
  await page.goto("/");

  if (isMobile) {
    await page.locator(testId("nav-folders")).click();
    await page.locator(testId(`folder-menu-Keep me`)).click();
    await page.locator(testId("folder-rename-option")).click();
  } else {
    await page.locator(testId("rename-folder-Keep me")).click();
  }
  await page.locator(testId("folder-rename-input")).fill("Changed");
  await page.locator(testId("rename-folder-cancel")).click();

  if (isMobile) {
    await expect(
      page.locator(testId("folder-list-item-Keep me")),
    ).toBeVisible();
    await expect(
      page.locator(testId("folder-list-item-Changed")),
    ).not.toBeVisible();
  } else {
    await expect(page.locator(testId("folder-btn-Keep me"))).toBeVisible();
    await expect(page.locator(testId("folder-btn-Changed"))).not.toBeVisible();
  }
});
