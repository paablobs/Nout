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
  Skeleton,
  Tooltip,
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

import { selectedView, type SelectedView } from "../../../utils/selectedView";
import { DEFAULT_CATEGORY } from "../../../utils/constants";
import SrOnly from "../../../utils/SrOnly";

interface Folder {
  id: string;
  name: string;
  color?: string;
}

interface LeftPanelProps {
  currentView: SelectedView;
  selectedFolderId: string | null;
  folders: Folder[];
  loading: boolean;
  cloudEnabled: boolean;
  cloudConnected: boolean;
  signedInEmail: string | null;
  onCloudSignIn: () => Promise<void>;
  onCloudSignOut: () => Promise<void>;
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
  loading,
  cloudEnabled,
  cloudConnected,
  signedInEmail,
  onCloudSignIn,
  onCloudSignOut,
  onViewChange,
  onFolderSelect,
  onAddFolder,
  onDeleteFolder,
  onNewNote,
}: LeftPanelProps) => {
  return (
    <Grid container spacing={0} direction={"column"} height={"100%"}>
      <Grid size="auto">
        <List aria-label="Primary navigation">
          <ListItem sx={{ paddingRight: 0, paddingTop: 0 }}>
            <Typography
              component="h1"
              sx={{
                fontSize: "2rem",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
              }}
            >
              <CodeIcon
                aria-hidden="true"
                sx={{
                  fontSize: "3rem",
                  marginRight: 1,
                  verticalAlign: "top",
                }}
              />
              Nout
            </Typography>
            {currentView !== selectedView.TRASH &&
              currentView !== selectedView.SCRATCHPAD && (
                <Tooltip title="Create new note">
                  <Button
                    data-testid="new-note-btn"
                    variant="contained"
                    color="secondary"
                    onClick={onNewNote}
                    disabled={loading}
                    aria-label="Create new note"
                    sx={{
                      aspectRatio: "1 / 1",
                      minWidth: 0,
                      borderRadius: "50%",
                      padding: 1,
                    }}
                  >
                    <NewNoteIcon aria-hidden="true" fontSize="large" />
                  </Button>
                </Tooltip>
              )}
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              data-testid="nav-scratchpad"
              selected={currentView === selectedView.SCRATCHPAD}
              onClick={() => onViewChange(selectedView.SCRATCHPAD)}
            >
              <ListItemIcon>
                <DashboardCustomizeIcon aria-hidden="true" />
              </ListItemIcon>
              <ListItemText primary="Scratchpad" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              data-testid="nav-notes"
              selected={currentView === selectedView.NOTES}
              onClick={() => onViewChange(selectedView.NOTES)}
            >
              <ListItemIcon>
                <NotesIcon aria-hidden="true" />
              </ListItemIcon>
              <ListItemText primary={DEFAULT_CATEGORY} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              data-testid="nav-favorites"
              selected={currentView === selectedView.FAVORITES}
              onClick={() => onViewChange(selectedView.FAVORITES)}
            >
              <ListItemIcon>
                <StarIcon aria-hidden="true" />
              </ListItemIcon>
              <ListItemText primary="Favorites" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              data-testid="nav-trash"
              selected={currentView === selectedView.TRASH}
              onClick={() => onViewChange(selectedView.TRASH)}
            >
              <ListItemIcon>
                <DeleteIcon aria-hidden="true" />
              </ListItemIcon>
              <ListItemText primary="Trash" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton data-testid="nav-add-folder" onClick={onAddFolder}>
              <ListItemIcon>
                <CreateNewFolderIcon aria-hidden="true" />
              </ListItemIcon>
              <ListItemText primary="Add folder" />
            </ListItemButton>
          </ListItem>
          <Divider sx={{ margin: 2 }} />
        </List>
      </Grid>
      <Grid size="grow" overflow={"auto"} sx={{ scrollbarGutter: "stable" }}>
        <List aria-label="Folders">
          {loading ? (
            <ListItem disablePadding>
              <div style={{ width: "100%", padding: "8px" }}>
                <Skeleton variant="rounded" height={48} />
              </div>
            </ListItem>
          ) : (
            folders.map((folder) => (
              <ListItem
                key={folder.id}
                data-testid={`folder-item-${folder.name}`}
                disablePadding
                secondaryAction={
                  <Tooltip title={`Delete folder "${folder.name}"`}>
                    <IconButton
                      edge="end"
                      data-testid={`delete-folder-${folder.name}`}
                      onClick={() => onDeleteFolder(folder)}
                      aria-label={`Delete folder ${folder.name}`}
                    >
                      <ClearIcon aria-hidden="true" />
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemButton
                  data-testid={`folder-btn-${folder.name}`}
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
                    <FolderIcon
                      aria-hidden="true"
                      sx={{ color: folder.color ?? yellow[500] }}
                    />
                  </ListItemIcon>
                  <ListItemText primary={folder.name} />
                </ListItemButton>
              </ListItem>
            ))
          )}
        </List>
      </Grid>
      <Grid
        size="auto"
        marginBottom={1}
        padding={2}
        style={{
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {cloudConnected && signedInEmail && (
          <Typography
            variant="body2"
            color="text.secondary"
            marginBottom={1}
            aria-label={`Signed in as ${signedInEmail}`}
          >
            <SrOnly>Signed in as </SrOnly>
            {signedInEmail}
          </Typography>
        )}
        <Button
          data-testid="cloud-auth-btn"
          fullWidth
          color="info"
          variant="outlined"
          disabled={!cloudEnabled || loading}
          onClick={() => {
            if (cloudConnected) {
              void onCloudSignOut();
            } else {
              void onCloudSignIn();
            }
          }}
        >
          {!cloudEnabled
            ? "Cloud disabled"
            : cloudConnected
              ? "Sign out from Google"
              : "Sign in with Google"}
        </Button>
      </Grid>
    </Grid>
  );
};

export default Sidebar;
