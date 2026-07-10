import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const svgPath = resolve(__dirname, "../public/og-image.svg");
const pngPath = resolve(__dirname, "../public/og-image.png");

const svg = readFileSync(svgPath, "utf-8");

const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  font: {
    loadSystemFonts: false,
  },
});

const pngData = resvg.render();
const pngBuffer = pngData.asPng();

writeFileSync(pngPath, pngBuffer);

console.log(`OG image generated: ${pngPath} (${pngBuffer.length} bytes)`);
