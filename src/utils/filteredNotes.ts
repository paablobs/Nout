import { selectedView, type SelectedView } from "../utils/selectedView";
import type { Note } from "../repositories/types";

export function filterNotes(
  notes: Record<string, Note>,
  view: SelectedView,
  folderId: string | null,
): Note[] {
  const all = Object.values(notes);

  switch (view) {
    case selectedView.NOTES:
      return all.filter((note) => !note.isTrash && !note.isHidden);

    case selectedView.FAVORITES:
      return all.filter(
        (note) => note.isFav && !note.isTrash && !note.isHidden,
      );

    case selectedView.TRASH:
      return all.filter((note) => note.isTrash);

    case selectedView.FOLDERS:
      return all.filter((note) => note.folderId === folderId && !note.isTrash);

    default:
      return [];
  }
}

export function isNoteVisibleInView(
  note: Note | null,
  view: SelectedView,
  folderId: string | null,
): boolean {
  if (!note) return false;
  return filterNotes({ [note.id]: note }, view, folderId).length > 0;
}

export function getFirstSelectableNoteId(
  notes: Record<string, Note>,
  view: SelectedView,
  folderId: string | null,
): string | null {
  if (view === selectedView.SCRATCHPAD) return null;
  return filterNotes(notes, view, folderId)[0]?.id ?? null;
}
