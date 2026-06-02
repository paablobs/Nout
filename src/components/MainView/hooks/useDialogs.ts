import { useReducer } from "react";

import type { Folder } from "../../../hooks/useNotes";

interface DialogState {
  openCreateFolder: boolean;
  openDeleteFolder: boolean;
  folderToDelete: Folder | null;
  openEmptyTrash: boolean;
}

export type DialogAction =
  | { type: "openCreateFolder" }
  | { type: "closeCreateFolder" }
  | { type: "openDeleteFolder"; folder: Folder }
  | { type: "closeDeleteFolder" }
  | { type: "openEmptyTrash" }
  | { type: "closeEmptyTrash" };

const initialDialogState: DialogState = {
  openCreateFolder: false,
  openDeleteFolder: false,
  folderToDelete: null,
  openEmptyTrash: false,
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
  }
}

export function useDialogs() {
  const [state, dispatch] = useReducer(dialogReducer, initialDialogState);
  return { state, dispatch };
}
