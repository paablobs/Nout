import { type Page } from "@playwright/test";

export const storageKeys = {
  NOTES: "notes",
  FOLDERS: "folders",
  SCRATCHPAD: "scratchpad",
};

export interface SeedNote {
  id: string;
  text: string;
  category: string;
  isFav: boolean;
  isTrash: boolean;
  isHidden: boolean;
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
    category: "Notes",
    isFav: false,
    isTrash: false,
    isHidden: false,
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
