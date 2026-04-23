This project uses **React 19 + TypeScript + Firebase (Firestore) + Material UI**.

This file defines **how an agent must reason before writing or modifying code**.
This is not a style guide — it is a _mental architecture guide_.

---

## 1. Core Principle: React is synchronization, not execution

React is not a place to “run logic”.
React is a system to **synchronize UI with state**.

Before writing code, the agent must ask:

> “Am I trying to execute logic… or describe how the UI depends on state?”

If the answer is “execute something”, it probably **does NOT belong in React**, but in:

- an event handler
- a pure function
- derived calculation
- logic outside render

---

## 2. `useEffect` is the last resort, not the first tool

In this project, **useEffect is considered an escape hatch**.

Never write a `useEffect` without first verifying it **cannot** be solved with:

### Derivation during render (preferred)

```ts
const completedNotes = notes.filter((n) => n.completed);
```

### Event handlers

```ts
const handleAddNote = () => {
  addNoteToFirestore();
};
```

### Derived state

```ts
const isEmpty = notes.length === 0;
```

### `useMemo` for heavy calculations

---

## 3. When `useEffect` IS allowed

Only in these cases:

1. Subscribing to something external (Firestore listeners, events, observers)
2. Cleaning up subscriptions
3. Imperative integrations with browser APIs
4. Synchronizing with systems React does not control

Valid example:

```ts
useEffect(() => {
  const unsub = onSnapshot(ref, (snap) => {
    setNotes(parse(snap));
  });
  return unsub;
}, [ref]);
```

Invalid example:

```ts
useEffect(() => {
  setFiltered(notes.filter(...));
}, [notes]);
```

That is derived logic → it belongs in render.

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
const filtered = notes.filter(...);
```

---

## 5. Firebase does NOT live inside effects by default

Reading from Firestore is not “an effect”, it is **an external data subscription**.

The correct mindset is:

> “I am connecting React to an external data source”

This must be encapsulated in dedicated hooks:

```ts
useNotes();
useFolders();
useUser();
```

Components **must not talk to Firestore directly**.

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

- hooks
- utils
- services

---

## 7. Correct mental flow before writing code

The agent must follow this order:

1. Is this a derived calculation? → do it in render
2. Does this happen due to user action? → event handler
3. Does this come from Firebase? → subscription hook
4. Is this real state or can it be derived?
5. Am I adding state just to “store something”? → probably bad design
6. Am I about to use `useEffect`? → re-read this file

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
const notes = useNotes();
const filtered = notes.filter(...);

return <NotesList notes={filtered} />;
```

### Incorrect pattern

```ts
useEffect(() => {
  fetchNotes();
}, []);
```

---

## 10. Design smells the agent must detect

- `useEffect` setting state
- Duplicated state
- Components calling Firestore
- `useEffect` reacting to internal state changes
- Business logic inside components
- Need for `eslint-disable react-hooks/exhaustive-deps`

If any of these appear, the agent must **refactor**, not patch.

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
- [ ] Is Firebase properly encapsulated?
- [ ] Does render describe the state without manual synchronization?

If any answer is “no”, the design must be reviewed.
