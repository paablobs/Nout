# Nout demo video

Silent walkthrough of the app, built with [Remotion](https://www.remotion.dev/). The rendered file
lives at `../docs/nout-demo.mp4` and is embedded in the root README.

This folder is a standalone pnpm project (own lockfile) so it does not affect the app's dependencies,
build or Vite bundle.

## How it works

1. `capture/record.mjs` drives the real app with Playwright (seeded localStorage, visible cursor,
   scripted clicks and typing) and writes `public/desktop.webm`, `public/phone.webm` and
   `public/markers.json` (chapter timestamps). These three files are generated and git-ignored.
2. `src/Video.tsx` composes the clips with the intro, chapter captions, phone frame and outro.

## Re-render

```bash
# terminal 1, from the repo root
pnpm dev

# terminal 2
cd video
pnpm install
pnpm record                # re-record the app (needs the dev server above)
pnpm studio                # optional: preview in Remotion Studio
pnpm render                # writes out/nout-demo.mp4
cp out/nout-demo.mp4 ../docs/nout-demo.mp4

# README GIF (plays inline on GitHub). Remotion's bundled ffmpeg has no fps filter, so use -r.
pnpm exec remotion ffmpeg -y -i out/nout-demo.mp4 -r 10 \\
  -vf "scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" \\
  -loop 0 ../docs/nout-demo.gif
```

Keep the result under 10 MB if you upload it through the GitHub web editor. Edit the seed data and
the scripted flow in `capture/record.mjs`, and captions and timing in `src/Video.tsx`.
