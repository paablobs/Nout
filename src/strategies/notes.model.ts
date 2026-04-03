export interface Note {
  id: string;
  text: string;
  folderId: string | null;
  isFav: boolean;
  isTrash: boolean;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}
