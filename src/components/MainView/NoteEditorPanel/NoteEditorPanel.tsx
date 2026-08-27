import { Grid, Skeleton } from "@mui/material";
import { selectedView, type SelectedView } from "../../../utils/selectedView";
import type { Note } from "../../../hooks/useNotes";
import Tiptap from "../../TextEditor/TipTap";

interface NoteEditorPanelProps {
  loading: boolean;
  currentView: SelectedView;
  scratchpadValue: string;
  selectedNote: Note | null;
  effectiveSelectedNoteId: string | null;
  onChange: (value: string) => void;
}

export const NoteEditorPanel = ({
  loading,
  currentView,
  scratchpadValue,
  selectedNote,
  effectiveSelectedNoteId,
  onChange,
}: NoteEditorPanelProps) => {
  const showEditor =
    Boolean(effectiveSelectedNoteId) || currentView === selectedView.SCRATCHPAD;

  if (!showEditor) return null;

  const content =
    currentView === selectedView.SCRATCHPAD
      ? scratchpadValue
      : selectedNote
        ? selectedNote.text
        : "";

  return (
    <Grid size="grow" className="mainView__rightPanel">
      {loading ? (
        <Skeleton variant="rectangular" width="100%" height="100%" />
      ) : (
        <Tiptap
          content={content}
          onChange={onChange}
          editable={currentView !== selectedView.TRASH}
          key={effectiveSelectedNoteId || selectedView.SCRATCHPAD}
        />
      )}
    </Grid>
  );
};
