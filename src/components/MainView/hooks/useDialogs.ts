import { useReducer } from "react";

import type { Folder } from "../../../repositories/types";

interface DialogState {
  openCreateFolder: boolean;
  openDeleteFolder: boolean;
  folderToDelete: Folder | null;
  openEmptyTrash: boolean;
  openRenameFolder: boolean;
  folderToRename: Folder | null;
  openSignOut: boolean;
}

export type DialogAction =
  | { type: "openCreateFolder" }
  | { type: "closeCreateFolder" }
  | { type: "openDeleteFolder"; folder: Folder }
  | { type: "closeDeleteFolder" }
  | { type: "openEmptyTrash" }
  | { type: "closeEmptyTrash" }
  | { type: "openRenameFolder"; folder: Folder }
  | { type: "closeRenameFolder" }
  | { type: "openSignOut" }
  | { type: "closeSignOut" };

const initialDialogState: DialogState = {
  openCreateFolder: false,
  openDeleteFolder: false,
  folderToDelete: null,
  openEmptyTrash: false,
  openRenameFolder: false,
  folderToRename: null,
  openSignOut: false,
};

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case "openCreateFolder":
      return { ...state, openCreateFolder: true };
    case "closeCreateFolder":
      return { ...state, openCreateFolder: false };
    case "openDeleteFolder":
      return {
        ...state,
        openDeleteFolder: true,
        folderToDelete: action.folder,
      };
    case "closeDeleteFolder":
      return { ...state, openDeleteFolder: false, folderToDelete: null };
    case "openEmptyTrash":
      return { ...state, openEmptyTrash: true };
    case "closeEmptyTrash":
      return { ...state, openEmptyTrash: false };
    case "openRenameFolder":
      return {
        ...state,
        openRenameFolder: true,
        folderToRename: action.folder,
      };
    case "closeRenameFolder":
      return { ...state, openRenameFolder: false, folderToRename: null };
    case "openSignOut":
      return { ...state, openSignOut: true };
    case "closeSignOut":
      return { ...state, openSignOut: false };
  }
}

export function useDialogs() {
  const [state, dispatch] = useReducer(dialogReducer, initialDialogState);
  return { state, dispatch };
}
