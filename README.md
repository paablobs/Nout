# Nout — Offline-first Rich Text Notes

<img width="2720" height="1532" alt="paablobs github io_Nout_" src="https://github.com/user-attachments/assets/0b748ba3-b2f2-41d5-a440-52382d0272f1" />

Nout is a compact, offline-first note-taking web app built with React, TypeScript and Vite. It combines a lightweight local-first data layer with a polished UI and a rich-text editor (TipTap) so you can create, organize and edit notes with no backend required.

## Features

- Rich-text editor (TipTap) with StarterKit, highlight, typography, color highlighter, smilie replacer, and code-block with syntax highlighting
- Scratchpad for quick notes that saves automatically and syncs when signed in
- Create, rename and delete folders (deleting a folder trashes its notes)
- Mark notes as favorites
- Hide sensitive notes from the All-notes list (they stay visible inside their folder)
- Search within Notes, Favorites and Folders views (plain-text match over HTML content)
- Notes carry `createdAt`/`updatedAt`/`trashedAt` timestamps; lists sort by most recent edit, trash sorts by trashed date
- Trash with restore, per-note trashed dates and automatic purge after 30 days
- Per-note HTML storage (TipTap) with safe previews in the note list
- Local persistence via localStorage repositories with cross-tab sync
- Optional Firebase cloud sync for notes, folders and scratchpad with live `onSnapshot` updates
- Responsive layout: phone drill-down navigation with bottom tab bar, folders list screen, compact 72px cards and FAB; sidebar layout on desktop
- Dark theme (JetBrains Mono) with OG image generation and SEO meta for `nout.it`
- Errors surface in a snackbar instead of dying in the console

## Quick start

1. Install dependencies:

```bash
pnpm install
```

2. Start the dev server with Vite:

```bash
pnpm dev
```

3. Build for production (runs `prebuild` to regenerate the OG image first):

```bash
pnpm build
```

4. Preview the production build:

```bash
pnpm preview
```

Node.js 24 (see `.nvmrc`) is required. Java 21+ is additionally required to run the Firebase emulators for tests.

## Firebase cloud mode (optional)

The Firebase web config is bundled with the app, so cloud mode works out of the box after cloning. Start the app and click `Sign in with Google` in the sidebar (or the account menu on phone).

Cloud behavior

- Without cloud connection: data is stored in localStorage (offline-first behavior)
- With cloud connection: notes, folders and scratchpad live in Firestore and update live across devices through `onSnapshot` listeners
- On first sign-in, notes and folders that only exist locally are copied to the cloud via `planMigration`. When the same note exists on both sides, the most recently edited version wins
- Cloud note edits are debounced (~400ms) and batched; pending saves flush on sign-out or unmount
- Firestore offline persistence is enabled using IndexedDB multi-tab cache, so signed-in users keep working offline and changes sync when back online
- Auth persistence uses browser local persistence so sessions survive browser restart
- If a popup sign-in is blocked (common in mobile in-app browsers), the app falls back to redirect-based sign-in
- Signing out asks for confirmation; an offline indicator chip appears when the connection drops

### Security rules

- The included `firestore.rules` restricts reads/writes to each authenticated user namespace: `users/{uid}/...`
- Notes require `id`, `text` (max 50k chars), `isFav`, `isTrash`, `isHidden`, with optional `createdAt`/`updatedAt` (`updatedAt >= createdAt`), `folderId` (max 128 chars) and `trashedAt`; folders require `id` plus a non-empty `name` (max 80 chars); scratchpad is a single `value` string (max 200k chars)
- Deploy rules with:

```bash
pnpm exec firebase-tools@latest deploy --only firestore:rules
```

## Responsive layout

Breakpoints live in `src/theme.ts`: phone below 768px, tablet 768–1023px, desktop at 1024px and up (`sm`/`md`).

- Phone: drill-down navigation (list → note), bottom tab bar (`BottomNav`), folders root screen (`FolderList`), compact single-row cards (`CompactCard`), `FabNewNote`, full-screen dialogs, and browser-history integration so the back button walks back through notes, folders and scratchpad
- Desktop/tablet: persistent sidebar (`Sidebar`), two-pane list plus editor
- `MainView` derives which pane to show from view state plus `useMediaQuery`; view state itself lives in the `useViewState` reducer

## Tests

### Unit tests (Vitest)

Pure data-layer logic: note schema normalization, sign-in migration planning, trash purge selection, note transforms, search and sorting, relative-time formatting, previews.

```bash
pnpm test:unit
```

### Firebase security and integration tests (emulator)

Tests are executed against Firebase Auth + Firestore emulators. Java 21+ is required by the current Firestore Emulator.

```bash
pnpm test:firebase
```

Covered scenarios:

- Auth emulator anonymous sign-up flow
- Firestore rules deny unauthenticated access
- Firestore rules allow owner CRUD for notes/folders/scratchpad
- Firestore rules deny cross-user access
- Firestore rules deny invalid schema writes (wrong types, extra fields, timestamp inconsistencies)
- Cloud repositories round-trip notes and folders against the emulator
- Repository writes converge through `onSnapshot` listeners

### E2E tests (Playwright)

Browser-based end-to-end tests that run against the Vite dev server in three projects: Desktop Chromium, Pixel 7, and iPad (with `isMobile: false`).

```bash
pnpm test:e2e
```

or with the interactive UI:

```bash
pnpm test:e2e:ui
```

The dev server is started automatically by the test runner via the `webServer` config.

Covered scenarios:

- Navigation between views (Notes, Favorites, Trash, Scratchpad, Folders)
- Creating, editing, favoriting, trashing, and restoring notes
- Hiding notes from the Notes view and finding them inside their folder
- Creating, renaming and deleting folders (delete trashes folder notes)
- Moving notes between folders
- Emptying the trash with confirmation
- Scratchpad editing and localStorage persistence
- Favorites view filtering
- Search filtering, empty-result states, and hidden-note search semantics
- Empty states for every view
- Phone drill-down: list to editor navigation, back-button history, bottom nav, folders root, compact cards, FAB visibility

Tests operate in offline-only mode using seeded localStorage data. No Firebase emulator required.

Run the full suite (unit + firebase):

```bash
pnpm test
```

CI (`.github/workflows/ci.yml`, required on PRs) runs `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm test:unit`, `pnpm test:firebase`, then installs Chromium/WebKit and runs `pnpm test:e2e`.

## Helpful scripts

- `pnpm lint` — run oxlint
- `pnpm lint:fix` — auto-fix lint issues
- `pnpm format` — format files with oxfmt
- `pnpm format:check` — check formatting without modifying
- `pnpm generate:og` — regenerate the OG image (`public/og-image.png`, runs automatically before build)

## Core ideas / architecture

- React + TypeScript + Vite for a fast developer experience
- MUI (Material UI) for consistent UI components, dark theme in `src/theme.ts`
- TipTap for WYSIWYG editing; notes are stored as HTML strings
- One subscription per store: signed-out users read localStorage repositories, signed-in users read Firestore via `onSnapshot` in `useNotes`. Mutations always go through the repository seam (`src/repositories/`), never through direct Firestore calls in components
- Pure logic lives in `src/utils/`: `noteTransforms` (create/toggle/trash/restore/move), `filteredNotes` (per-view filtering, single source of truth), `noteQuery` (search + sorting), `noteSchema` (normalize/sanitize/backfill), `noteMigration` (first-sign-in plan), `noteLifecycle` (30-day purge selection), `notePreview` (HTML to list text)
- Hooks: `useNotes` (notes + folders live-sync and actions), `useScratchpad` (thin wrapper over the generic `useCloudSync` single-doc sync), `useSession` (auth state, popup with redirect fallback), `useReportError` (snackbar)
- `MainView` owns view state (`useViewState` reducer), dialog state (`useDialogs` reducer) and offline status (`useOfflineStatus`); filtering, search and sorting are derived during render
- See `AGENTS.md` for the reasoning rules agents must follow when changing React code
