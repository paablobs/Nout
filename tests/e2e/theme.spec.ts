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

async function openSettings(page: Page) {
  if (isPhone(page)) {
    await page.locator('[aria-label="Account"]').click();
    await page.locator(testId("account-settings")).click();
  } else {
    await page.locator(testId("settings-btn")).click();
  }
  await expect(page.locator(testId("settings-dialog"))).toBeVisible();
}

test.describe("settings dialog", () => {
  test.beforeEach(async ({ page }) => {
    await page.reload();
  });

  test("picking a preset recolors the app and persists", async ({ page }) => {
    await openSettings(page);
    await page.locator(testId("accent-coral")).click();

    await expect(page.locator(testId("accent-coral"))).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(await page.evaluate(() => localStorage.getItem("themeAccent"))).toBe(
      JSON.stringify("#ff7043"),
    );

    await page.locator(testId("settings-close")).click();
    await expect(page.locator(testId("settings-dialog"))).toBeHidden();
    await expect(actionButton(page)).not.toHaveCSS(
      "background-color",
      DEFAULT_ACTION_RGB,
    );

    await page.reload();
    await openSettings(page);
    await expect(page.locator(testId("accent-coral"))).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("a custom color is applied", async ({ page }) => {
    await openSettings(page);
    await page.locator(testId("accent-custom-input")).fill("#ff8800");

    expect(await page.evaluate(() => localStorage.getItem("themeAccent"))).toBe(
      JSON.stringify("#ff8800"),
    );
    await expect(page.locator(testId("accent-reset"))).toBeEnabled();
    await page.locator(testId("settings-close")).click();
    await expect(actionButton(page)).not.toHaveCSS(
      "background-color",
      DEFAULT_ACTION_RGB,
    );
    await expect(page.locator(testId("nav-notes"))).toHaveCSS(
      isPhone(page) ? "color" : "background-color",
      isPhone(page) ? "rgb(255, 136, 0)" : /rgba\(255, 136, 0, /,
    );
  });

  test("a near-black custom color is lifted to stay readable", async ({
    page,
  }) => {
    await openSettings(page);
    await page.locator(testId("accent-custom-input")).fill("#000000");
    await page.locator(testId("settings-close")).click();

    await expect(page.locator(testId("nav-notes"))).not.toHaveCSS(
      isPhone(page) ? "color" : "background-color",
      /rgba?\(0, 0, 0[,)]/,
    );
  });

  test("reset restores the default and clears the stored key", async ({
    page,
  }) => {
    await openSettings(page);
    await page.locator(testId("accent-purple")).click();
    await page.locator(testId("accent-reset")).click();

    await expect(page.locator(testId("accent-default"))).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator(testId("accent-reset"))).toBeDisabled();
    expect(await page.evaluate(() => localStorage.getItem("themeAccent"))).toBe(
      null,
    );

    await page.locator(testId("settings-close")).click();
    await expect(actionButton(page)).toHaveCSS(
      "background-color",
      DEFAULT_ACTION_RGB,
    );
  });
});

test("the Google sign-in button keeps its color by default and follows the accent", async ({
  page,
}) => {
  const signIn = page.locator(testId("cloud-auth-btn"));
  // The sidebar footer (and this button) only exists on desktop.
  test.skip(isPhone(page), "sidebar is desktop-only");

  await page.reload();
  await expect(signIn).toBeEnabled();
  await expect(signIn).toHaveCSS("color", "rgb(41, 182, 246)");

  await page.evaluate(() => {
    localStorage.setItem("themeAccent", JSON.stringify("#ff8800"));
  });
  await page.reload();
  await expect(signIn).toBeEnabled();
  await expect(signIn).toHaveCSS("color", "rgb(255, 136, 0)");
});
