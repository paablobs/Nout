# Nout — Offline-first Rich Text Notes

<img width="2720" height="1532" alt="paablobs github io_Nout_" src="https://github.com/user-attachments/assets/0b748ba3-b2f2-41d5-a440-52382d0272f1" />

Nout is a compact, offline-first note-taking web app built with React, TypeScript and Vite. It combines a lightweight local-first data layer with a polished UI and a rich-text editor (TipTap) so you can create, organize and edit notes with no backend required.

## Features

- Rich-text editor (TipTap) with typography, highlight and code-block extensions
- Scratchpad for quick notes that saves automatically and syncs when signed in
- Create, rename and delete folders
- Mark notes as favorites
- Hide sensitive notes from the All-notes list (they stay visible inside their folder)
- Search within the current view
- Notes carry created/edited timestamps and lists sort by most recent edit
- Trash with restore, per-note trashed dates and automatic purge after 30 days
- Per-note HTML storage (TipTap) with safe previews in the note list
- Local persistence via a robust `useLocalStorage` hook (syncs across tabs)
- Optional Firebase cloud sync for notes, folders and scratchpad with live updates

## Quick start

1. Install dependencies:

```bash
pnpm install
```

2. Start the dev server with Vite:

```bash
pnpm dev
```

3. Build for production:

```bash
pnpm build
```

4. Preview the production build:

```bash
pnpm preview
```

Node.js 24 (see `.nvmrc`) is required. Java 21+ is additionally required to run the Firebase emulators for tests.

## Firebase cloud mode (optional)

The Firebase web config is bundled with the app, so cloud mode works out of the box after cloning. Start the app and click `Sign in with Google` in the sidebar.

Cloud behavior

- Without cloud connection: data is stored in localStorage (offline-first behavior)
- With cloud connection: notes, folders and scratchpad live in Firestore and update live across devices through `onSnapshot` listeners
- On first sign-in, notes and folders that only exist locally are copied to the cloud. When the same note exists on both sides, the most recently edited version wins
- Firestore offline persistence is enabled using IndexedDB multi-tab cache, so signed-in users keep working offline and changes sync when back online
- Auth persistence uses browser local persistence so sessions survive browser restart
- If a popup sign-in is blocked (common in mobile in-app browsers), the app falls back to redirect-based sign-in

### Security rules

- The included `firestore.rules` restricts reads/writes to each authenticated user namespace: `users/{uid}/...`
- Deploy rules with:

```bash
pnpm exec firebase-tools@latest deploy --only firestore:rules
```

## Tests

### Unit tests (Vitest)

Pure data-layer logic: note schema normalization, sign-in migration planning, trash purge selection, note transforms, search and sorting.

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

Browser-based end-to-end tests that run against the Vite dev server with Chromium.

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
- Creating, renaming and deleting folders
- Moving notes between folders
- Emptying the trash with confirmation
- Scratchpad editing and localStorage persistence
- Favorites view filtering
- Search filtering, empty-result states, and hidden-note search semantics
- Empty states for every view

Tests operate in offline-only mode using seeded localStorage data. No Firebase emulator required.

Run the full suite (unit + firebase):

```bash
pnpm test
```

## Helpful scripts

- `pnpm lint` — run oxlint
- `pnpm format` — format files with oxfmt
- `pnpm format:check` — check formatting without modifying

## Core ideas / architecture

- React + TypeScript + Vite for a fast developer experience
- MUI (Material UI) for consistent UI components
- TipTap for WYSIWYG editing; notes are stored as HTML strings
- The data layer is split by mode: anonymous users read and write through localStorage-backed repositories, signed-in users through Firestore repositories. Either way, state arrives in React through one subscription per store and mutations go through the repository seam
- `useLocalStorage` provides a React-friendly interface to localStorage with cross-tab update dispatching
- Errors surface in a snackbar instead of dying in the console
