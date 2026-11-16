import { describe, expect, it } from "vitest";
import { createTheme, getContrastRatio } from "@mui/material/styles";
import {
  BACKGROUND_COLOR,
  DEFAULT_ACCENT,
  DEFAULT_SECONDARY,
  derivePalette,
  normalizeAccent,
} from "../../src/utils/accentTheme";
import { createNoutTheme } from "../../src/theme";

describe("normalizeAccent", () => {
  it("accepts #rrggbb and lowercases it", () => {
    expect(normalizeAccent("#FF8800")).toBe("#ff8800");
  });

  it("expands #rgb shorthand", () => {
    expect(normalizeAccent("#f80")).toBe("#ff8800");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeAccent("  #ff8800 ")).toBe("#ff8800");
  });

  it.each(["", "ff8800", "#ff88", "#gggggg", "red", "#ff8800ff", null, 42])(
    "falls back to the default for %j",
    (input) => {
      expect(normalizeAccent(input)).toBe(DEFAULT_ACCENT);
    },
  );
});

describe("derivePalette", () => {
  it("returns null for the default accent", () => {
    expect(derivePalette(DEFAULT_ACCENT)).toBeNull();
    expect(derivePalette("not-a-color")).toBeNull();
  });

  it("keeps an already readable accent as the primary", () => {
    expect(derivePalette("#ff8800")?.primary).toBe("#ff8800");
  });

  it.each(["#000000", "#000080", "#111111", "#1a0033", "#0a0908"])(
    "lifts dark accent %s until it is readable on the background",
    (accent) => {
      const palette = derivePalette(accent);
      expect(palette).not.toBeNull();
      expect(
        getContrastRatio(palette!.primary, BACKGROUND_COLOR),
      ).toBeGreaterThanOrEqual(3);
    },
  );

  it("derives a dark secondary of the same hue family", () => {
    const palette = derivePalette("#ff0000")!;
    const r = parseInt(palette.secondary.slice(1, 3), 16);
    const g = parseInt(palette.secondary.slice(3, 5), 16);
    const b = parseInt(palette.secondary.slice(5, 7), 16);
    expect(r).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(b);
    expect(getContrastRatio(palette.secondary, "#ffffff")).toBeGreaterThan(4.5);
  });

  it.each([
    "#ff0000",
    "#ffff00",
    "#00ff00",
    "#00ffff",
    "#0000ff",
    "#ff00ff",
    "#ff8800",
    "#88ff00",
    "#00ff88",
    "#0088ff",
    "#8800ff",
    "#ff0088",
    "#ffffff",
  ])("keeps white text readable on the secondary for %s", (accent) => {
    const palette = derivePalette(accent)!;
    expect(getContrastRatio(palette.secondary, "#ffffff")).toBeGreaterThan(4.5);
  });

  it("handles greys and white without NaN", () => {
    for (const accent of ["#808080", "#ffffff"]) {
      const palette = derivePalette(accent)!;
      expect(palette.primary).toMatch(/^#[0-9a-f]{6}$/);
      expect(palette.secondary).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("createNoutTheme", () => {
  it("matches the previous palette with the default accent", () => {
    const theme = createNoutTheme();
    const muiDark = createTheme({ palette: { mode: "dark" } });
    expect(theme.palette.primary).toEqual(muiDark.palette.primary);
    expect(theme.palette.secondary.main).toBe(DEFAULT_SECONDARY);
  });

  it("applies a custom accent to primary and secondary", () => {
    const theme = createNoutTheme("#ff8800");
    expect(theme.palette.primary.main).toBe("#ff8800");
    expect(theme.palette.secondary.main).not.toBe(DEFAULT_SECONDARY);
  });

  it("leaves semantic colors untouched", () => {
    expect(createNoutTheme("#ff8800").palette.error.main).toBe("#942020");
  });
});
