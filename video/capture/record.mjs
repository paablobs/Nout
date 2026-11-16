// Records scripted walkthroughs of the real Nout app with Playwright.
// Needs the Nout dev server running on http://localhost:5173 (pnpm dev in the Nout repo).
// Outputs: public/desktop.webm, public/phone.webm and public/markers.json
import {
  chromium,
  devices,
} from "../../node_modules/@playwright/test/index.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(here, "..", "public");
const tmpDir = path.join(here, "..", ".tmp-video");
const BASE = process.env.NOUT_URL ?? "http://localhost:5173/";
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });

const seed = ({ now }) => {
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const mk = (id, text, ago, extra = {}) => ({
    id,
    text,
    isFav: false,
    isTrash: false,
    isHidden: false,
    createdAt: now - ago - HOUR,
    updatedAt: now - ago,
    ...extra,
  });
  const notes = [
    mk(
      "n1",
      "<h2>Weekly sync</h2><p>Agenda: roadmap, hiring, invoice review.</p>",
      40 * MIN,
      { folderId: "work" },
    ),
    mk(
      "n2",
      "<h2>Reading list</h2><ul><li><p>Designing Data-Intensive Applications</p></li><li><p>The Pragmatic Programmer</p></li></ul>",
      3 * HOUR,
      { isFav: true },
    ),
    mk(
      "n3",
      "<h2>Invoice 1042</h2><p>Send to the client before Friday.</p>",
      26 * HOUR,
      { folderId: "work" },
    ),
    mk(
      "n4",
      "<h2>Wi-Fi and door codes</h2><p>Sensitive: hidden from the main list.</p>",
      90 * MIN,
      { folderId: "work" },
    ),
    mk("n5", "<h2>Old draft</h2><p>Not needed any more.</p>", 4 * HOUR),
  ];
  localStorage.setItem(
    "notes",
    JSON.stringify(Object.fromEntries(notes.map((n) => [n.id, n]))),
  );
  localStorage.setItem(
    "folders",
    JSON.stringify([{ id: "work", name: "Work", color: "#4fc3f7" }]),
  );
  localStorage.setItem("scratchpad", JSON.stringify(""));
};

// Visible cursor + click ripple (headless recordings have no cursor).
const overlay = () => {
  const init = () => {
    if (document.getElementById("__cursor")) return;
    const c = document.createElement("div");
    c.id = "__cursor";
    c.style.cssText =
      "position:fixed;left:0;top:0;width:32px;height:32px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.6))";
    c.innerHTML =
      '<svg width="28" height="28" viewBox="0 0 24 24"><path d="M4 2l15 9-6.5 1.6L9.6 19z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    const style = document.createElement("style");
    style.textContent =
      "@keyframes __rip{from{transform:translate(-50%,-50%) scale(.2);opacity:.9}to{transform:translate(-50%,-50%) scale(1.6);opacity:0}}";
    document.documentElement.appendChild(style);
    addEventListener(
      "mousemove",
      (e) => (c.style.transform = `translate(${e.clientX}px,${e.clientY}px)`),
      true,
    );
    addEventListener(
      "mousedown",
      (e) => {
        const r = document.createElement("div");
        r.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;width:56px;height:56px;border-radius:50%;background:rgba(79,195,247,.55);z-index:2147483646;pointer-events:none;animation:__rip .55s ease-out forwards`;
        document.documentElement.appendChild(r);
        setTimeout(() => r.remove(), 600);
      },
      true,
    );
  };
  if (document.readyState === "loading")
    addEventListener("DOMContentLoaded", init);
  else init();
};

const SPEED = 0.62; // <1 = faster pacing
const sleep = (ms) => new Promise((r) => setTimeout(r, ms * SPEED));

async function run(name, contextOptions, flow) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...contextOptions,
    recordVideo: { dir: tmpDir, size: contextOptions.viewport },
  });
  await context.addInitScript(overlay);
  const page = await context.newPage();
  const t0 = Date.now();
  const markers = {};
  const mark = (label) => (markers[label] = (Date.now() - t0) / 1000);

  await page.goto(BASE);
  await page.evaluate(seed, { now: Date.now() });
  await page.goto(BASE);
  await page.waitForSelector('[data-testid^="note-card-"]');
  await page.mouse.move(
    contextOptions.viewport.width / 2,
    contextOptions.viewport.height / 2,
  );

  let cur = {
    x: contextOptions.viewport.width / 2,
    y: contextOptions.viewport.height / 2,
  };
  const glide = async (x, y, ms = 550) => {
    const steps = Math.max(12, Math.round(ms / 16));
    const from = cur;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      await page.mouse.move(
        from.x + (x - from.x) * e,
        from.y + (y - from.y) * e,
      );
      await sleep(ms / steps);
    }
    cur = { x, y };
  };
  const click = async (sel, { pause = 500, dx = 0, dy = 0 } = {}) => {
    const loc = typeof sel === "string" ? page.locator(sel).first() : sel;
    await loc.waitFor();
    await loc.scrollIntoViewIfNeeded();
    await sleep(150);
    const b = await loc.boundingBox();
    await glide(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy);
    await sleep(120);
    await page.mouse.down();
    await sleep(60);
    await page.mouse.up();
    await sleep(pause);
  };
  const type = async (text, delay = 55) =>
    page.keyboard.type(text, { delay: delay * SPEED });
  const api = {
    page,
    click,
    type,
    glide,
    sleep,
    mark,
    tid: (id) => `[data-testid="${id}"]`,
  };

  await sleep(900);
  mark("start");
  await flow(api);
  mark("end");
  await sleep(600);
  const videoPath = await page.video().path();
  await context.close();
  await browser.close();
  fs.mkdirSync(publicDir, { recursive: true });
  fs.copyFileSync(videoPath, path.join(publicDir, `${name}.webm`));
  return markers;
}

const desktopFlow = async ({ page, click, type, sleep, mark, tid }) => {
  // 1. Write a rich-text note
  mark("write");
  await click(tid("new-note-btn"), { pause: 700 });
  await click(".ProseMirror", { pause: 400 });
  await type("## Trip to Lisbon\n");
  await type("Things to do **before Friday**:\n");
  await type(
    "- Book flights\nReserve a hotel\nPack light -- it's sunny :-D \n\n",
    60,
  );
  await sleep(300);
  await type("```js \nconst days = 5;", 60);
  await sleep(1400);

  // 2. Favorite
  mark("favorite");
  const newCard = page.locator('[data-testid^="note-card-"]').first();
  const newId = (await newCard.getAttribute("data-testid")).replace(
    "note-card-",
    "",
  );
  await click(tid(`fav-btn-${newId}`), { pause: 1100 });
  await click(tid("nav-favorites"), { pause: 1600 });

  // 3. Folders
  mark("folders");
  await click(tid("nav-notes"), { pause: 700 });
  await click(tid("nav-add-folder"), { pause: 700 });
  await click(tid("folder-name-input"), { pause: 300 });
  await type("Travel", 90);
  await sleep(400);
  await click(tid("create-folder-submit"), { pause: 900 });
  await click(tid(`move-folder-btn-${newId}`), { pause: 700 });
  await click(tid("move-to-folder-Travel"), { pause: 1000 });
  await click(tid("folder-btn-Travel"), { pause: 1500 });
  await click(tid("nav-notes"), { pause: 700 });

  // 4. Search
  mark("search");
  await click('input[placeholder="Search notes"]', { pause: 400 });
  await type("invoice", 110);
  await sleep(1600);
  await click(tid("notes-search-clear"), { pause: 900 });

  // 5. Hide a note
  mark("hide");
  await click(tid("three-dot-btn-n4"), { pause: 600 });
  await click(tid("hide-note-n4"), { pause: 1500 });
  await click(tid("folder-btn-Work"), { pause: 1600 });
  await click(tid("nav-notes"), { pause: 700 });

  // 6. Trash + restore
  mark("trash");
  await click(tid("trash-btn-n5"), { pause: 900 });
  await click(tid("nav-trash"), { pause: 1100 });
  await click(tid("restore-btn-n5"), { pause: 1100 });
  await click(tid("nav-notes"), { pause: 900 });

  // 7. Scratchpad
  mark("scratchpad");
  await click(tid("nav-scratchpad"), { pause: 700 });
  await click(".ProseMirror", { pause: 300 });
  await type("Quick thought: call Ana about the invoice", 55);
  await sleep(1600);
};

const phoneFlow = async ({ page, click, type, sleep, mark, tid }) => {
  mark("list");
  await sleep(900);
  await click(tid("note-card-n2"), { pause: 1400 });
  mark("editor");
  await click(".ProseMirror", { pause: 300 });
  await type(" (2026)", 90);
  await sleep(800);
  await click('[aria-label="Back"]', { pause: 1000 });
  mark("folders");
  await click(tid("bottom-nav") + " >> text=Folders", { pause: 1200 });
  await click(tid("bottom-nav") + " >> text=Notes", { pause: 700 });
  mark("fab");
  await click(tid("fab-new-note"), { pause: 600 });
  await click(".ProseMirror", { pause: 300 });
  await type("Buy milk and eggs", 70);
  await sleep(1400);
};

const which = process.argv[2] ?? "all";
const out = {};
if (which === "all" || which === "desktop") {
  out.desktop = await run(
    "desktop",
    { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 },
    desktopFlow,
  );
}
if (which === "all" || which === "phone") {
  const p7 = devices["Pixel 7"];
  out.phone = await run(
    "phone",
    { ...p7, viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 },
    phoneFlow,
  );
}
const mpath = path.join(publicDir, "markers.json");
const prev = fs.existsSync(mpath)
  ? JSON.parse(fs.readFileSync(mpath, "utf8"))
  : {};
fs.writeFileSync(mpath, JSON.stringify({ ...prev, ...out }, null, 2));
console.log(JSON.stringify(out, null, 2));
