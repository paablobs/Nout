import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  List,
  Divider,
  Button,
  Grid,
  Typography,
} from "@mui/material";
import {
  DashboardCustomizeOutlined as DashboardCustomizeIcon,
  DeleteOutline as DeleteIcon,
  StarOutline as StarIcon,
  FolderOutlined as FolderIcon,
  ClearOutlined as ClearIcon,
  NotesOutlined as NotesIcon,
  CreateNewFolderOutlined as CreateNewFolderIcon,
  EditNoteOutlined as NewNoteIcon,
  CodeOutlined as CodeIcon,
} from "@mui/icons-material";
import { yellow } from "@mui/material/colors";
import { auth } from "../../../config/firebase";

import { selectedView, type SelectedView } from "../../../utils/selectedView";
import { firebaseSignOut } from "../../../config/auth";
import type { Folder } from "../../../strategies/folder.model";

interface LeftPanelProps {
  currentView: SelectedView;
  selectedFolderId: string | null;
  folders: Folder[];
  onViewChange: (view: SelectedView) => void;
  onFolderSelect: (folderId: string) => void;
  onAddFolder: () => void;
  onDeleteFolder: (folder: Folder) => void;
  onNewNote: () => void;
}

const Sidebar = ({
  currentView,
  selectedFolderId,
  folders,
  onViewChange,
  onFolderSelect,
  onAddFolder,
  onDeleteFolder,
  onNewNote,
}: LeftPanelProps) => {
  return (
    <Grid container spacing={0} direction={"column"} height={"100%"}>
      <Grid size="auto">
        <List>
          <ListItem sx={{ paddingRight: 0, paddingTop: 0 }}>
            <ListItemText
              slotProps={{ primary: { fontSize: "2rem", fontWeight: "bold" } }}
            >
              <CodeIcon
                sx={{
                  fontSize: "3rem",
                  marginRight: 1,
                  verticalAlign: "top",
                }}
              />
              Nout
            </ListItemText>
            {currentView !== selectedView.TRASH &&
              currentView !== selectedView.SCRATCHPAD && (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={onNewNote}
                  sx={{
                    aspectRatio: "1 / 1",
                    minWidth: 0,
                    borderRadius: "50%",
                    padding: 1,
                  }}
                >
                  <NewNoteIcon fontSize="large" />
                </Button>
              )}
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              selected={currentView === selectedView.SCRATCHPAD}
              onClick={() => onViewChange(selectedView.SCRATCHPAD)}
            >
              <ListItemIcon>
                <DashboardCustomizeIcon />
              </ListItemIcon>
              <ListItemText primary="Scratchpad" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              selected={currentView === selectedView.NOTES}
              onClick={() => onViewChange(selectedView.NOTES)}
            >
              <ListItemIcon>
                <NotesIcon />
              </ListItemIcon>
              <ListItemText primary="All notes" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              selected={currentView === selectedView.FAVORITES}
              onClick={() => onViewChange(selectedView.FAVORITES)}
            >
              <ListItemIcon>
                <StarIcon />
              </ListItemIcon>
              <ListItemText primary="Favorites" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              selected={currentView === selectedView.TRASH}
              onClick={() => onViewChange(selectedView.TRASH)}
            >
              <ListItemIcon>
                <DeleteIcon />
              </ListItemIcon>
              <ListItemText primary="Trash" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={onAddFolder}>
              <ListItemIcon>
                <CreateNewFolderIcon />
              </ListItemIcon>
              <ListItemText primary="Add folder" />
            </ListItemButton>
          </ListItem>
          <Divider sx={{ margin: 2 }} />
        </List>
      </Grid>
      <Grid
        size="grow"
        overflow={"auto"}
        sx={{ scrollbarGutter: "stable", marginBottom: 2 }}
      >
        <List>
          {folders.map((folder) => (
            <ListItem
              key={folder.id}
              disablePadding
              secondaryAction={
                <IconButton
                  edge="end"
                  onClick={() => onDeleteFolder(folder)}
                  aria-label="delete-folder"
                >
                  <ClearIcon />
                </IconButton>
              }
            >
              <ListItemButton
                selected={
                  currentView === selectedView.FOLDERS &&
                  selectedFolderId === folder.id
                }
                onClick={() => {
                  onViewChange(selectedView.FOLDERS);
                  onFolderSelect(folder.id);
                }}
              >
                <ListItemIcon>
                  <FolderIcon sx={{ color: folder.color ?? yellow[500] }} />
                </ListItemIcon>
                <ListItemText primary={folder.name} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Grid>
      {!auth?.currentUser ? (
        <Button
          variant="contained"
          color="info"
          onClick={() => onViewChange(selectedView.LOGIN)}
          sx={{ margin: 2 }}
        >
          Sign in
        </Button>
      ) : (
        <>
          <Typography variant="body2" align="center">
            Signed as {auth?.currentUser?.displayName}
          </Typography>
          <Button
            variant="outlined"
            color="info"
            onClick={() => firebaseSignOut()}
            sx={{ margin: 2 }}
          >
            Sign out
          </Button>
        </>
      )}
    </Grid>
  );
};

export default Sidebar;
