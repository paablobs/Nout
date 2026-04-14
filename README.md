# Nout — Offline-first Rich Text Notes

<img width="2720" height="1532" alt="paablobs github io_Nout_" src="https://github.com/user-attachments/assets/0b748ba3-b2f2-41d5-a440-52382d0272f1" />

Nout is a compact, offline-first note-taking web app built with React, TypeScript and Vite. It combines a lightweight local-first data layer with a polished UI and a rich-text editor (TipTap) so you can create, organize and edit notes with no backend required.

Features

- Rich-text editor (TipTap) with typography and highlight extensions
- Scratchpad for quick ephemeral notes
- Create, rename and delete folders
- Mark notes as favorites
- Trash with restore and Empty Trash
- Per-note HTML storage (TipTap) with safe previews in the note list
- Local persistence via a robust `useLocalStorage` hook (syncs across tabs)
- Optional Firebase cloud sync for notes, folders and scratchpad

Quick start

1. Install dependencies:

```bash
npm install
```

2. Start the dev server with Vite:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

4. Preview the production build:

```bash
npm run preview
```

Firebase cloud mode (optional)

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Fill all `VITE_FIREBASE_*` values in `.env` from your Firebase Web app settings.

3. Start the app and click `Connect cloud` in the sidebar.

Cloud behavior

- Without cloud connection: data is stored in localStorage (offline-first behavior)
- With cloud connection: notes, folders and scratchpad are persisted in Firestore
- Firestore offline persistence is enabled using IndexedDB multi-tab cache
- Auth persistence uses browser local persistence so sessions survive browser restart

Security rules

- The included `firestore.rules` restricts reads/writes to each authenticated user namespace: `users/{uid}/...`
- Deploy rules with:

```bash
npx -y firebase-tools@latest deploy --only firestore:rules
```

Firebase security tests (emulator)

- Tests are executed against Firebase Auth + Firestore emulators.
- Java 21+ is required by current Firestore Emulator.

Run all Firebase tests:

```bash
npm test
```

or explicitly:

```bash
npm run test:firebase
```

Covered scenarios:

- Auth emulator anonymous sign-up flow
- Firestore rules deny unauthenticated access
- Firestore rules allow owner CRUD for notes/folders/scratchpad
- Firestore rules deny cross-user access
- Firestore rules deny invalid schema writes

Helpful scripts

- `npm run lint` — run ESLint
- `npm run storybook` — start Storybook for components

Core ideas / architecture

- React + TypeScript + Vite for a fast developer experience
- MUI (Material UI) for consistent UI components
- TipTap for WYSIWYG editing; notes are stored as HTML strings
- `useLocalStorage` provides a React-friendly interface to localStorage with cross-tab update dispatching
