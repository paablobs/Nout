import { test, expect, type Page } from "@playwright/test";
import { testId, clearLocalStorage } from "./helpers";

const DEFAULT_ACTION_RGB = "rgb(46, 68, 46)";
const PHONE_MAX_WIDTH = 767;

const isPhone = (page: Page) =>
  (page.viewportSize()?.width ?? Infinity) <= PHONE_MAX_WIDTH;

// The filled secondary action: sidebar button on desktop, FAB on phone.
const actionButton = (page: Page) =>
  page.locator(testId(isPhone(page) ? "fab-new-note" : "new-note-btn"));

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await clearLocalStorage(page);
});

test("default accent keeps the original green action button", async ({
  page,
}) => {
  await page.reload();
  await expect(actionButton(page)).toHaveCSS(
    "background-color",
    DEFAULT_ACTION_RGB,
  );
});

test("first load does not write a theme key", async ({ page }) => {
  await page.reload();
  await expect(actionButton(page)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("themeAccent"))).toBe(
    null,
  );
});

test("a stored accent recolors the app and survives reload", async ({
  page,
}) => {
  await page.evaluate(() => {
    localStorage.setItem("themeAccent", JSON.stringify("#ff8800"));
  });
  await page.reload();

  // The selected nav item is tinted on the desktop sidebar and colored on the
  // phone bottom nav; both derive from the primary color.
  const nav = page.locator(testId("nav-notes"));
  const expectAccent = async () => {
    if (isPhone(page)) {
      await expect(nav).toHaveCSS("color", "rgb(255, 136, 0)");
    } else {
      await expect(nav).toHaveCSS("background-color", /rgba\(255, 136, 0, /);
    }
    await expect(actionButton(page)).not.toHaveCSS(
      "background-color",
      DEFAULT_ACTION_RGB,
    );
  };

  await expectAccent();
  await page.reload();
  await expectAccent();
});

test("an invalid stored accent falls back to the default", async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem("themeAccent", JSON.stringify("javascript:alert(1)"));
  });
  await page.reload();

  await expect(actionButton(page)).toHaveCSS(
    "background-color",
    DEFAULT_ACTION_RGB,
  );
});
