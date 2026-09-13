import { Fab } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

interface FabNewNoteProps {
  onClick: () => void;
  visible: boolean;
}

const FabNewNote = ({ onClick, visible }: FabNewNoteProps) => {
  if (!visible) return null;

  return (
    <Fab
      data-testid="fab-new-note"
      color="secondary"
      aria-label="New note"
      onClick={onClick}
      sx={{
        position: "fixed",
        bottom: 76,
        right: 16,
        zIndex: 1000,
      }}
    >
      <AddIcon />
    </Fab>
  );
};

export default FabNewNote;
