import type { Folder } from "./folder.model";

export interface FoldersStrategy {
  addFolder(folder: Folder): Promise<void>;
  getFolders(): Promise<Folder[]>;
}
