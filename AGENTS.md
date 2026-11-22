This project uses **React 19 + TypeScript + Firebase (Firestore) + Material UI + Tiptap**.

This file defines **how an agent must reason before writing or modifying code**.
This is not a style guide — it is a _mental architecture guide_.

---

## 0. Project Stack & Tooling

### Core Stack

- **React 19** + **TypeScript** + **Vite**
- **Firebase (Firestore)** for cloud sync (optional, offline-first by default)
- **Material UI (MUI)** for UI components, dark theme in `src/theme.ts`
- **Tiptap** for rich-text editing (notes stored as HTML). Extensions: StarterKit, Highlight, Typography, ColorHighlighter, SmilieReplacer, CodeBlockLowlight

### Package Manager

- **pnpm** (v11.9.0) — enforced via `preinstall` script
- Never use npm or yarn

### Linting & Formatting

- **oxlint** for linting (not ESLint)
- **oxfmt** for formatting (not Prettier)
- Config files: `.oxlintrc.json`, `.oxfmtrc.json`
- Run: `pnpm lint` / `pnpm format`

### Testing

- **Vitest** for unit tests (`tests/unit/`, config `vitest.unit.config.ts`)
- **Firebase Emulators** for rules + repository integration tests (`tests/firebase/`, config `vitest.firebase.config.ts`, Java 21+ required)
- **Playwright** for E2E tests (`tests/e2e/`, projects: chromium, pixel-7, ipad)
- Run: `pnpm test` (unit + firebase), `pnpm test:unit` (unit only), `pnpm test:firebase` (emulator only), `pnpm test:e2e` (Playwright)
- CI (`.github/workflows/ci.yml`, required on PRs): lint, format:check, build, unit, firebase, then e2e on Chromium/WebKit

### Pre-commit Hooks

- **Husky** + **lint-staged**
- Runs `oxlint --fix` and `oxfmt` on staged `*.{js,ts,tsx}` files

### Node Version

- Node.js v24 (see `.nvmrc`)

---

## 0.1. Where things live (read this before touching code)

- `src/repositories/` — the only persistence seam. `types.ts` defines `Note`, `Folder`, `NotesRepository`, `FoldersRepository`. `local/` implements them on localStorage, `cloud/` on Firestore (batched via `firestoreBatch.ts`). Components and hooks must go through these, never call Firestore directly (the only exceptions are `useNotes` and `useCloudSync`, which own the subscriptions).
- `src/utils/` — pure functions, no React, no Firebase. `noteTransforms` (create/toggle/trash/restore/move), `filteredNotes` (per-view filtering, the single source of truth), `noteQuery` (search + sorting), `noteSchema` (normalize/sanitize/backfill), `noteMigration` (first-sign-in `planMigration`), `noteLifecycle` (30-day purge via `selectPurgeIds`), `notePreview` (HTML to list text), `selectedView` (view constants), `accentTheme` (accent normalization, contrast-safe palette derivation, presets, cloud (de)serialization).
- `src/hooks/` — external data subscriptions. `useNotes` owns notes + folders live-sync (localStorage when signed out, `onSnapshot` when signed in, debounced ~400ms cloud saves, migration + purge on connect) and exposes all note/folder actions. `useCloudSync` is the generic single-doc sync used by `useScratchpad` and `useThemeAccent`; it takes optional `onRemoteValue` (called from the snapshot handler when a remote value is applied, never during an unsettled local write) and `shouldSeed` (whether a missing cloud doc is created from the local value). `useThemeAccent` keeps the local key as what the UI reads (picks apply instantly, first paint never waits for the cloud) and uses `useCloudSync` only to sync it. `useLocalStorage` is the cross-tab localStorage bridge.
- `src/contexts/` — `SessionContext` (`useSession`: auth state, Google sign-in with redirect fallback, sign-out), `ErrorContext` (`useReportError`: snackbar).
- `src/components/MainView/` — the app shell. `MainView.tsx` composes `Sidebar`, `FolderView`, `FolderList`, `NoteEditorPanel`, `BottomNav`, `FabNewNote`, dialogs, `SearchNotesField`. Local UI state lives in `hooks/useViewState` (view/folder/note selection reducer), `hooks/useDialogs` (dialog reducer), `hooks/useOfflineStatus`. `SettingsDialog` (accent picker) is presentational; `App` owns the single accent subscription and passes `accent`/`onAccentChange` to `MainView`.
- `src/components/Card/` — `Card` (desktop list row) and `CompactCard` (phone single-row 72px layout), plus `Card.types.ts`.
- `src/components/TextEditor/` — `TipTap.tsx` plus custom extensions.
- `src/theme.ts` — breakpoints (`sm` 768 phone, `md` 1024 desktop), dark palette, JetBrains Mono. `createNoutTheme(accent)` builds the theme: the default accent leaves MUI's primary/info and the original secondary untouched; a custom accent sets `primary` and `info` (the contrast-clamped accent) and a dark `secondary` derived from it. `App` rebuilds it with `useMemo` when the accent changes. Do not switch to MUI `cssVariables` mode: `Card`/`CompactCard` use `alpha(theme.palette.primary.main, …)`.
- `firestore.rules` — per-user `users/{uid}/...` namespace with strict note/folder/scratchpad/theme schemas (`meta/theme` is `{ value }`, `""` or a lowercase `#rrggbb`; keep it in agreement with `serializeAccent`). Keep rules, `noteSchema.ts`, and the cloud repositories in agreement when the model changes.

### Note model

```ts
interface Note {
  id: string;
  text: string; // TipTap HTML
  isFav: boolean;
  isTrash: boolean;
  isHidden: boolean;
  createdAt: number;
  updatedAt: number;
  trashedAt?: number;
  folderId?: string;
}
```

There is no `category` field. Legacy `category` values are stripped on write and ignored on read (rules still tolerate the key for old documents).

### Product behavior worth knowing

- Notes carry `createdAt`/`updatedAt`/`trashedAt` timestamps; lists sort by most recent edit, trash sorts by trashed date.
- Deleting a folder trashes its notes. Hidden notes are excluded from the All-notes list but stay visible inside their folder.
- Search is a plain-text match over the HTML content, within Notes, Favorites and Folders views. Note previews are sanitized text extracted from the HTML.
- Trash restores notes and purges them automatically after 30 days.
- Accent themes: a preset or any custom color, chosen in Settings (sidebar footer on desktop, account menu on phone). Dark picks are lightened automatically so they stay readable, and the default look is unchanged until an accent is picked. The Google sign-in button follows the accent.
- Errors surface in a snackbar instead of dying in the console. The app ships a generated OG image and SEO meta for `nout.it`.

---

## 0.2. Commands

```bash
pnpm install    # Node 24 (.nvmrc); Java 21+ is also needed for the Firebase emulators
pnpm dev        # Vite dev server
pnpm build      # production build; `prebuild` regenerates the OG image first
pnpm preview    # preview the production build
```

Other scripts: `pnpm lint` (oxlint), `pnpm lint:fix`, `pnpm format` (oxfmt), `pnpm format:check`, `pnpm generate:og` (regenerates `public/og-image.png`, runs automatically before build).

## 0.3. Cloud mode (Firebase, optional)

The Firebase web config is bundled with the app, so cloud mode works out of the box after cloning. Signing in happens through `Sign in with Google` in the sidebar (account menu on phone).

- Without a cloud connection, data lives in localStorage (offline-first behavior).
- With a cloud connection, notes, folders, scratchpad and accent color live in Firestore and update live across devices through `onSnapshot` listeners.
- On first sign-in, notes and folders that only exist locally are copied to the cloud via `planMigration`. When the same note exists on both sides, the most recently edited version wins.
- The accent color is applied from localStorage immediately and saved to `users/{uid}/meta/theme`; a pick made on another device is written back to the local copy. No cloud doc is created until an accent is picked.
- Cloud note edits are debounced (~400ms) and batched; pending saves flush on sign-out or unmount.
- Firestore offline persistence uses the IndexedDB multi-tab cache, so signed-in users keep working offline and changes sync when back online.
- Auth persistence uses browser local persistence so sessions survive a browser restart.
- If a popup sign-in is blocked (common in mobile in-app browsers), the app falls back to redirect-based sign-in.
- Signing out asks for confirmation; an offline indicator chip appears when the connection drops.

### Security rules

- `firestore.rules` restricts reads and writes to each authenticated user's namespace: `users/{uid}/...`.
- Notes require `id`, `text` (max 50k chars), `isFav`, `isTrash`, `isHidden`, with optional `createdAt`/`updatedAt` (`updatedAt >= createdAt`), `folderId` (max 128 chars) and `trashedAt`. Folders require `id` plus a non-empty `name` (max 80 chars). The scratchpad is a single `value` string (max 200k chars). The theme doc is a single `value` that is `""` (default) or a lowercase `#rrggbb`.
- Deploy `firestore.rules` before shipping an app version that syncs the accent, otherwise signed-in accent saves are rejected.
- Deploy rules with:

```bash
pnpm exec firebase-tools@latest deploy --only firestore:rules
```

## 0.4. Responsive layout

Breakpoints live in `src/theme.ts`: phone below 768px, tablet 768–1023px, desktop at 1024px and up (`sm`/`md`).

- Phone: drill-down navigation (list → note), bottom tab bar (`BottomNav`), folders root screen (`FolderList`), compact single-row cards (`CompactCard`), `FabNewNote`, full-screen dialogs, and browser-history integration so the back button walks back through notes, folders and scratchpad.
- Desktop/tablet: persistent sidebar (`Sidebar`), two-pane list plus editor.
- `MainView` derives which pane to show from view state plus `useMediaQuery`; view state itself lives in the `useViewState` reducer.

## 0.5. Test coverage

**Unit (Vitest, `pnpm test:unit`)** — pure data-layer logic: note schema normalization, sign-in migration planning, trash purge selection, note transforms, search and sorting, relative-time formatting, previews, accent normalization, contrast-safe palette derivation and the cloud accent format.

**Firebase security and integration (emulator, `pnpm test:firebase`)** — runs against the Firebase Auth + Firestore emulators (Java 21+). Covers:

- Auth emulator anonymous sign-up flow
- Rules deny unauthenticated access, allow owner CRUD for notes/folders/scratchpad, and deny cross-user access
- Rules deny invalid schema writes (wrong types, extra fields, timestamp inconsistencies)
- Rules accept only `""` or a lowercase `#rrggbb` for the theme doc, and deny malformed colors, extra fields and cross-user access
- Cloud repositories round-trip notes and folders against the emulator
- Repository writes converge through `onSnapshot` listeners

**E2E (Playwright, `pnpm test:e2e`, or `pnpm test:e2e:ui` for the interactive UI)** — runs against the Vite dev server, started automatically by the `webServer` config, in three projects: Desktop Chromium, Pixel 7, and iPad (`isMobile: false`). Tests run offline-only with seeded localStorage data, so no Firebase emulator is required. Covers:

- Navigation between views (Notes, Favorites, Trash, Scratchpad, Folders) and empty states for every view
- Creating, editing, favoriting, trashing, restoring and moving notes; emptying the trash with confirmation
- Hiding notes from the Notes view and finding them inside their folder
- Creating, renaming and deleting folders (delete trashes folder notes)
- Scratchpad editing and localStorage persistence
- Search filtering, empty-result states, and hidden-note search semantics; Favorites filtering
- Accent themes: default look, stored and invalid accents, picking a preset or custom color in Settings (desktop and phone), dark colors lifted for contrast, reset, and the sign-in button following the accent
- Phone drill-down: list to editor navigation, back-button history, bottom nav, folders root, compact cards, FAB visibility

`pnpm test` runs the full suite of unit + firebase tests. CI (`.github/workflows/ci.yml`, required on PRs) runs `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm test:unit`, `pnpm test:firebase`, then installs Chromium/WebKit and runs `pnpm test:e2e`.

---

## 1. Core Principle: React is synchronization, not execution

React is not a place to “run logic”.
React is a system to **synchronize UI with state**.

Before writing code, the agent must ask:

> “Am I trying to execute logic… or describe how the UI depends on state?”

If the answer is “execute something”, it probably **does NOT belong in React**, but in:

- an event handler
- a pure function in `src/utils/`
- derived calculation
- logic outside render

---

## 2. `useEffect` is the last resort, not the first tool

In this project, **useEffect is considered an escape hatch**.

Never write a `useEffect` without first verifying it **cannot** be solved with:

### Derivation during render (preferred)

```ts
const listedNotes = sortByUpdatedAtDesc(
  searchNotes(filterNotes(notes, currentView, folderId), query),
);
```

### Event handlers

```ts
const handleAddNote = () => {
  addNote(currentView, selectedFolderId ?? undefined);
};
```

### Derived state

```ts
const isEmpty = listedNotes.length === 0;
```

### `useMemo` for heavy calculations

---

## 3. When `useEffect` IS allowed

Only in these cases:

1. Subscribing to something external (Firestore listeners, auth state, online/offline events)
2. Cleaning up subscriptions
3. Imperative integrations with browser APIs (TipTap content sync, phone history entries)
4. Synchronizing with systems React does not control

Valid example:

```ts
useEffect(() => {
  const unsub = onSnapshot(ref, (snap) => {
    setCloudNotes(parse(snap));
  });
  return unsub;
}, [user]);
```

Invalid example:

```ts
useEffect(() => {
  setFiltered(notes.filter(...));
}, [notes]);
```

That is derived logic → it belongs in render (see `filteredNotes.ts` + `noteQuery.ts`).

---

## 4. Critical rule: never store in state what can be calculated

This creates bugs, extra renders, and loops.

❌ Incorrect:

```ts
const [filtered, setFiltered] = useState<Note[]>([]);

useEffect(() => {
  setFiltered(notes.filter(...));
}, [notes]);
```

✅ Correct:

```ts
const listedNotes = useMemo(() => {
  const visible = filterNotes(notes, currentView, validSelectedFolderId);
  return sortByUpdatedAtDesc(searchNotes(visible, searchQuery));
}, [notes, currentView, validSelectedFolderId, searchQuery]);
```

---

## 5. Firebase does NOT live inside effects by default

Reading from Firestore is not “an effect”, it is **an external data subscription**.

The correct mindset is:

> “I am connecting React to an external data source”

Subscriptions are owned by exactly three places:

```ts
useNotes(); // notes + folders live-sync and all note/folder actions
useScratchpad(); // thin wrapper over generic useCloudSync for the scratchpad doc
useThemeAccent(); // thin wrapper over generic useCloudSync for the accent doc (called once, in App)
```

Plus `useSession()` for auth and `useReportError()` for failure display. Components **must not talk to Firestore directly** and **must not invent new subscriptions**. New persistence goes through `src/repositories/` and is exposed through `useNotes`/`useCloudSync`.

---

## 5.1. Responsive rules

- Breakpoints come from the theme (`useMediaQuery(theme.breakpoints.down("sm"))` for phone). Do not hardcode pixel values in components; `BREAKPOINT_PHONE`/`BREAKPOINT_TABLET` live in `src/theme.ts`.
- Phone uses drill-down navigation backed by `history.pushState`/`popstate` in `MainView.tsx` (`phoneHistoryState`, `phoneParentState`, `needsPhoneParentEntry`). When adding a phone-navigable state, extend those helpers instead of adding parallel history logic.
- Phone-only UI (`BottomNav`, `FolderList`, `FabNewNote`, `CompactCard`, fullScreen dialogs, phone toolbar + account menu) is derived from `isPhone` plus view state during render. Do not duplicate this branching into new state.
- E2E coverage for responsive behavior lives in `tests/e2e/phone-drill-down.spec.ts` and runs on all three Playwright projects. Update it when navigation changes.

---

## 6. Components must be pure

An ideal component in this project:

- Receives state
- Renders UI
- Triggers events
- Contains no data logic
- Contains no unnecessary effects
- Contains no heavy transformations

If a component grows, logic must move to:

- `src/utils/` (pure transforms, filtering, sorting)
- `src/hooks/` (subscriptions only)
- `src/repositories/` (persistence only)

`MainView` is the deliberate exception that composes state; its children (`FolderView`, `NoteEditorPanel`, dialogs, cards) stay presentational.

---

## 7. Correct mental flow before writing code

The agent must follow this order:

1. Is this a derived calculation? → do it in render (`filteredNotes`, `noteQuery`)
2. Does this happen due to user action? → event handler calling a `useNotes` action
3. Does this come from Firebase? → it already arrives via `useNotes`/`useScratchpad`/`useThemeAccent`; do not add a fetch
4. Is this real state or can it be derived?
5. Am I adding state just to “store something”? → probably bad design
6. Am I about to use `useEffect`? → re-read this file
7. Am I about to import `firebase/firestore` outside `repositories/`, `useNotes`, or `useCloudSync`? → stop, use the repository seam

---

## 8. React 19: think render-first

React 19 favors:

- Pure components
- Fewer effects
- More derivation in render
- More declarative logic
- Less manual synchronization

If the code looks imperative, the approach is wrong.

---

## 9. Expected patterns in this project

### Correct pattern

```ts
const { notes, folders, updateNoteText } = useNotes();
const listedNotes = sortByUpdatedAtDesc(
  searchNotes(filterNotes(notes, currentView, folderId), query),
);

return <FolderView notes={listedNotes} onChange={updateNoteText} />;
```

### Incorrect pattern

```ts
useEffect(() => {
  fetchNotes();
}, []);
```

New note/folder mutations are pure functions in `noteTransforms.ts` applied through `useNotes` actions, which persist via the active repository.

---

## 10. Design smells the agent must detect

- `useEffect` setting state
- Duplicated state
- Components calling Firestore
- New data-fetching hooks beside `useNotes`/`useCloudSync`
- Filtering/sorting logic copied into components instead of using `filteredNotes`/`noteQuery`
- `useEffect` reacting to internal state changes
- Business logic inside components
- Need for `eslint-disable react-hooks/exhaustive-deps`

If any of these appear, the agent must **refactor**, not patch.

---

## 10.1. Code quality enforcement

This project uses **oxlint** and **oxfmt** (not ESLint/Prettier).

- Before committing, always run:
  ```bash
  pnpm lint        # Check for lint errors
  pnpm lint:fix    # Auto-fix lint errors
  pnpm format      # Format code with oxfmt
  pnpm format:check # Check formatting without modifying
  ```
- The pre-commit hook (Husky + lint-staged) will automatically run `oxlint --fix` and `oxfmt` on staged files
- If you encounter linting issues, fix them before committing
- **Do NOT use `eslint-disable` comments** — they are not recognized by oxlint

---

## 10.2. Testing discipline

- Pure logic → `tests/unit/` (Vitest). Add cases alongside `noteTransforms`, `noteSchema`, `noteMigration`, `noteLifecycle`, `noteQuery`, `filteredNotes`, `accentTheme` tests.
- Rules or repository behavior → `tests/firebase/` (emulator, Java 21+). Keep `firestore.rules`, `noteSchema.ts`, `accentTheme.ts` (`serializeAccent`) and cloud repositories consistent; the security test asserts exact allowed/denied shapes, including the `meta/theme` doc.
- User flows → `tests/e2e/` (Playwright, offline-only seeded localStorage). Phone navigation changes require updates to `phone-drill-down.spec.ts`; theme and Settings dialog flows live in `theme.spec.ts` (the signed-in sync path can't run offline, so it is covered by the rules tests).

---

## 11. Project philosophy

This project prefers:

> Less code, less state, fewer effects, more derivation, more purity.

---

## Mandatory reference before touching React code

Read:

`docs/react-effects.md` (You Might Not Need an Effect)

But understand that this document is **only the starting point**.
This AGENTS.md defines **how to apply that thinking in this project**.

---

## 12. Final checklist before committing React changes

- [ ] Did I add an unnecessary effect?
- [ ] Did I store something in state that can be derived?
- [ ] Is the component still pure?
- [ ] Is Firebase properly encapsulated (repository seam only)?
- [ ] Does render describe the state without manual synchronization?
- [ ] If the model changed, are `repositories/types.ts`, `noteSchema.ts`, cloud repositories, and `firestore.rules` still in agreement?
- [ ] If navigation changed, are the phone history helpers and `phone-drill-down.spec.ts` updated?

If any answer is “no”, the design must be reviewed.
