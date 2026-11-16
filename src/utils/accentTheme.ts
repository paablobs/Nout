import { getContrastRatio } from "@mui/material/styles";

// Empty string means "no custom accent": the theme keeps MUI's default primary
// and the original dark-green secondary.
export const DEFAULT_ACCENT = "";

// Must match the page background: also hardcoded in index.html (theme-color)
// and public/site.webmanifest, which can't import it.
export const BACKGROUND_COLOR = "#0a0908";
export const DEFAULT_SECONDARY = "#2e442e";

const MIN_PRIMARY_CONTRAST = 3;
const SECONDARY_LIGHTNESS = 0.28;
const SECONDARY_MAX_SATURATION = 0.45;
const LIGHTNESS_STEP = 0.02;

interface Hsl {
  h: number;
  s: number;
  l: number;
}

export interface AccentPalette {
  primary: string;
  secondary: string;
}

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

// Accepts "#rgb" or "#rrggbb" (any case) and returns lowercase "#rrggbb".
// Anything else resolves to DEFAULT_ACCENT, so stored garbage can never reach
// the theme.
export function normalizeAccent(input: unknown): string {
  if (typeof input !== "string") return DEFAULT_ACCENT;
  const value = input.trim();
  if (!HEX_PATTERN.test(value)) return DEFAULT_ACCENT;
  const digits = value.slice(1).toLowerCase();
  const full =
    digits.length === 3
      ? digits
          .split("")
          .map((c) => c + c)
          .join("")
      : digits;
  return `#${full}`;
}

function hexToHsl(hex: string): Hsl {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };

  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

function hslToHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  const channel = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

// Raises lightness until the color reads against the app background, so a
// dark pick (e.g. black) can't make selected items or focus rings invisible.
function ensureReadableOnBackground(hex: string): string {
  const hsl = hexToHsl(hex);
  let candidate = hex;
  while (
    getContrastRatio(candidate, BACKGROUND_COLOR) < MIN_PRIMARY_CONTRAST &&
    hsl.l < 1
  ) {
    hsl.l = Math.min(1, hsl.l + LIGHTNESS_STEP);
    candidate = hslToHex(hsl);
  }
  return candidate;
}

// Returns null for the default accent: the caller should then leave MUI's
// default primary and the original secondary untouched.
export function derivePalette(accent: string): AccentPalette | null {
  const normalized = normalizeAccent(accent);
  if (normalized === DEFAULT_ACCENT) return null;

  const { h, s } = hexToHsl(normalized);
  return {
    primary: ensureReadableOnBackground(normalized),
    secondary: hslToHex({
      h,
      s: Math.min(s, SECONDARY_MAX_SATURATION),
      l: SECONDARY_LIGHTNESS,
    }),
  };
}
