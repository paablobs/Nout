import type { Note } from "../repositories/types";

export function createNote(
  now: number,
  options: { isFav?: boolean; folderId?: string } = {},
): Note {
  return {
    id: crypto.randomUUID(),
    text: "",
    isFav: options.isFav === true,
    isTrash: false,
    isHidden: false,
    createdAt: now,
    updatedAt: now,
    ...(options.folderId ? { folderId: options.folderId } : {}),
  };
}

export function withUpdatedText(note: Note, text: string, now: number): Note {
  return { ...note, text, updatedAt: now };
}

export function withToggledFavorite(note: Note): Note {
  return { ...note, isFav: !note.isFav };
}

export function withToggledHidden(note: Note): Note {
  return { ...note, isHidden: !note.isHidden };
}

export function withTrashed(note: Note, now: number): Note {
  return { ...note, isTrash: true, trashedAt: now };
}

export function withRestored(note: Note): Note {
  const { trashedAt: _trashedAt, ...restored } = {
    ...note,
    isTrash: false,
    isHidden: false,
  };
  return restored;
}

export function withFolderMoved(note: Note, folderId: string | null): Note {
  if (!folderId) {
    const { folderId: _existing, ...rest } = note;
    return rest;
  }
  return { ...note, folderId };
}

export interface FolderDeletionPlan {
  nextNotes: Record<string, Note>;
  trashedNotes: Note[];
}

export function planFolderDeletion(
  notes: Record<string, Note>,
  folderId: string,
  now: number,
): FolderDeletionPlan {
  const nextNotes: Record<string, Note> = {};
  const trashedNotes: Note[] = [];
  for (const [noteId, note] of Object.entries(notes)) {
    if (note.folderId === folderId) {
      const trashed = withTrashed(
        withFolderMoved({ ...note, isHidden: false }, null),
        now,
      );
      nextNotes[noteId] = trashed;
      trashedNotes.push(trashed);
    } else {
      nextNotes[noteId] = note;
    }
  }
  return { nextNotes, trashedNotes };
}
