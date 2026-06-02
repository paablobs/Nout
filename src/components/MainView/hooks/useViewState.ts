import { useReducer } from "react";

import { selectedView, type SelectedView } from "../../../utils/selectedView";

interface ViewState {
  currentView: SelectedView;
  selectedFolderId: string | null;
  selectedNoteId: string | null;
}

export type ViewAction =
  | { type: "viewChange"; view: SelectedView }
  | { type: "folderSelect"; folderId: string }
  | { type: "clearFolderSelection" }
  | { type: "noteSelect"; noteId: string | null };

const initialViewState: ViewState = {
  currentView: selectedView.NOTES,
  selectedFolderId: null,
  selectedNoteId: null,
};

function viewReducer(state: ViewState, action: ViewAction): ViewState {
  switch (action.type) {
    case "viewChange":
      return { ...state, currentView: action.view };
    case "folderSelect":
      return { ...state, selectedFolderId: action.folderId };
    case "clearFolderSelection":
      return { ...state, selectedFolderId: null };
    case "noteSelect":
      return { ...state, selectedNoteId: action.noteId };
  }
}

export function useViewState() {
  const [state, dispatch] = useReducer(viewReducer, initialViewState);
  return { state, dispatch };
}
