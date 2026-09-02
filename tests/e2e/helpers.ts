import { type Page } from "@playwright/test";

export const storageKeys = {
  NOTES: "notes",
  FOLDERS: "folders",
  SCRATCHPAD: "scratchpad",
};

export interface SeedNote {
  id: string;
  text: string;
  isFav: boolean;
  isTrash: boolean;
  isHidden: boolean;
  createdAt: number;
  updatedAt: number;
  trashedAt?: number;
  folderId?: string;
}

export interface SeedFolder {
  id: string;
  name: string;
  color?: string;
}

export function testId(id: string) {
  return `[data-testid="${id}"]`;
}

export async function clearLocalStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
  });
}

export async function seedLocalStorage(
  page: Page,
  data: {
    notes?: Record<string, SeedNote>;
    folders?: SeedFolder[];
    scratchpad?: string;
  },
) {
  await page.evaluate(({ notes, folders, scratchpad }) => {
    if (notes !== undefined) {
      localStorage.setItem("notes", JSON.stringify(notes));
    }
    if (folders !== undefined) {
      localStorage.setItem("folders", JSON.stringify(folders));
    }
    if (scratchpad !== undefined) {
      localStorage.setItem("scratchpad", JSON.stringify(scratchpad));
    }
  }, data);
}

export function makeNote(overrides: Partial<SeedNote> = {}): SeedNote {
  const id = overrides.id ?? crypto.randomUUID();
  return {
    id,
    text: "",
    isFav: false,
    isTrash: false,
    isHidden: false,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

export function makeFolder(overrides: Partial<SeedFolder> = {}): SeedFolder {
  const id = overrides.id ?? crypto.randomUUID();
  return {
    id,
    name: "Test Folder",
    color: "#ff0000",
    ...overrides,
  };
}

/** Navigate to a sidebar nav item, handling mobile bottom nav */
export async function navigateToView(page: Page, view: string) {
  const sidebarBtn = page.locator(testId(`nav-${view}`));
  const bottomNavBtn = page.locator(
    `[data-testid="bottom-nav"] button >> text="${view.charAt(0).toUpperCase() + view.slice(1)}"`,
  );

  if (await sidebarBtn.isVisible().catch(() => false)) {
    await sidebarBtn.click();
  } else if (await bottomNavBtn.isVisible().catch(() => false)) {
    await bottomNavBtn.click();
  }
}
