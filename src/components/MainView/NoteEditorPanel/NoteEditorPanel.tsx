import {
  AppBar,
  Box,
  IconButton,
  Skeleton,
  Toolbar,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
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
  isPhone: boolean;
  onBack: () => void;
  editorTitle: string;
  onTrash?: () => void;
}

export const NoteEditorPanel = ({
  loading,
  currentView,
  scratchpadValue,
  selectedNote,
  effectiveSelectedNoteId,
  onChange,
  isPhone,
  onBack,
  editorTitle,
  onTrash,
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

  if (isPhone) {
    return (
      <Box
        className="mainView__rightPanel"
        sx={{ display: "flex", flexDirection: "column", height: "100%" }}
      >
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar variant="dense">
            <IconButton edge="start" onClick={onBack} aria-label="Back">
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="subtitle1" sx={{ flex: 1, marginLeft: 1 }}>
              {editorTitle}
            </Typography>
            {currentView !== selectedView.TRASH && onTrash && (
              <IconButton edge="end" onClick={onTrash} aria-label="Delete note">
                <DeleteOutlineIcon />
              </IconButton>
            )}
          </Toolbar>
        </AppBar>
        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
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
        </Box>
      </Box>
    );
  }

  return (
    <Box className="mainView__rightPanel" sx={{ flex: 1, minWidth: 0 }}>
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
    </Box>
  );
};
