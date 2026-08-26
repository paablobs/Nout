export interface Note {
  id: string;
  text: string;
  category: string;
  isFav: boolean;
  isTrash: boolean;
  isHidden: boolean;
  folderId?: string;
}

export interface Folder {
  id: string;
  name: string;
  color?: string;
}

export interface NotesRepository {
  getAll(): Promise<Record<string, Note>>;
  upsert(note: Note): Promise<void>;
  upsertBatch(notes: Note[]): Promise<void>;
  remove(noteId: string): Promise<void>;
  removeBatch(noteIds: string[]): Promise<void>;
}

export interface FoldersRepository {
  getAll(): Promise<Folder[]>;
  upsert(folder: Folder): Promise<void>;
  upsertBatch(folders: Folder[]): Promise<void>;
  remove(folderId: string): Promise<void>;
}
