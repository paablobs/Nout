export interface CustomCardProps {
  id: string;
  text: string;
  isFav?: boolean;
  isTrash?: boolean;
  isHidden?: boolean;
  updatedAt: number;
  trashedAt?: number;
  onFav?: (id: string) => void;
  onTrash?: (id: string) => void;
  onRestore?: (id: string) => void;
  onHide?: (id: string) => void;
  folders?: { id: string; name: string; color?: string }[];
  onMoveToFolder?: (noteId: string, folderId: string) => void;
  folderId?: string | null;
  onSelect?: (id: string) => void;
  selected?: boolean;
  compact?: boolean;
}
