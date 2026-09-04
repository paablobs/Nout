import {
  Box,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/FolderOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useState } from "react";

interface Folder {
  id: string;
  name: string;
  color?: string;
}

interface FolderListProps {
  folders: Folder[];
  onFolderSelect: (folderId: string) => void;
  onRenameFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
}

const FolderList = ({
  folders,
  onFolderSelect,
  onRenameFolder,
  onDeleteFolder,
}: FolderListProps) => {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuFolder, setMenuFolder] = useState<Folder | null>(null);

  const handleMenuOpen = (e: React.MouseEvent, folder: Folder) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget as HTMLElement);
    setMenuFolder(folder);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuFolder(null);
  };

  if (folders.length === 0) {
    return (
      <Box paddingX={2} paddingY={6} textAlign="center">
        <p style={{ color: "rgba(255,255,255,0.6)" }}>
          No folders yet. Create one to organize your notes.
        </p>
      </Box>
    );
  }

  return (
    <>
      <List disablePadding>
        {folders.map((folder) => (
          <ListItemButton
            key={folder.id}
            data-testid={`folder-list-item-${folder.name}`}
            onClick={() => onFolderSelect(folder.id)}
          >
            <ListItemIcon>
              <FolderIcon sx={{ color: folder.color ?? "#FFC107" }} />
            </ListItemIcon>
            <ListItemText primary={folder.name} />
            <IconButton
              edge="end"
              data-testid={`folder-menu-${folder.name}`}
              onClick={(e) => handleMenuOpen(e, folder)}
              aria-label={`Options for ${folder.name}`}
              size="small"
            >
              <MoreVertIcon />
            </IconButton>
          </ListItemButton>
        ))}
      </List>
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem
          data-testid="folder-rename-option"
          onClick={() => {
            if (menuFolder) onRenameFolder(menuFolder);
            handleMenuClose();
          }}
        >
          Rename
        </MenuItem>
        <MenuItem
          data-testid="folder-delete-option"
          onClick={() => {
            if (menuFolder) onDeleteFolder(menuFolder);
            handleMenuClose();
          }}
        >
          Delete
        </MenuItem>
      </Menu>
    </>
  );
};

export default FolderList;
