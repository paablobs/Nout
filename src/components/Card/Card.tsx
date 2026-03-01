import Card from "@mui/material/Card";
import Box from "@mui/material/Box";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import { yellow } from "@mui/material/colors";
import {
  Star as StarIcon,
  StarBorder as StarredIcon,
  RestoreOutlined as RestoreIcon,
  DeleteOutlineOutlined as DeleteOutlineIcon,
  DriveFileMoveOutlined as MoveToFolderIcon,
  PendingOutlined as ThreeDotMenuIcon,
} from "@mui/icons-material";
import PopupState, { bindTrigger, bindMenu } from "material-ui-popup-state";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { alpha } from "@mui/material";

import { DEFAULT_CATEGORY } from "../../hooks/useNotes";
import "./Card.css";

interface CustomCardProps {
  id: string;
  text: string;
  category: string;
  isFav?: boolean;
  isTrash?: boolean;
  isHidden?: boolean;
  onFav?: (id: string) => void;
  onTrash?: (id: string) => void;
  onRestore?: (id: string) => void;
  onHide?: (id: string) => void;
  folders?: { id: string; name: string; color?: string }[];
  onMoveToFolder?: (noteId: string, folderId: string) => void;
  folderId?: string | null;
  onSelect?: (id: string) => void;
  selected?: boolean;
}

const CustomCard = ({
  id,
  text,
  category,
  isFav,
  isTrash,
  isHidden,
  onFav,
  onTrash,
  onRestore,
  onHide,
  folders,
  onMoveToFolder,
  folderId,
  onSelect,
  selected,
}: CustomCardProps) => {
  const stripHtml = (html: string) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "\n");
  };

  const getFirstLine = (html: string) => {
    const plain = stripHtml(html).trim();
    if (!plain) return "New note";
    const lines = plain
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    return lines.length ? lines[0] : "New note";
  };

  const moveToFolderPopup = () => (
    <PopupState variant="popover" popupId={`move-folder-popup-${id}`}>
      {(popupState) => {
        const availableFolders = (folders || []).filter(
          (f) => f.id !== folderId,
        );
        return (
          <>
            <IconButton {...bindTrigger(popupState)}>
              <MoveToFolderIcon />
            </IconButton>
            <Menu {...bindMenu(popupState)}>
              {availableFolders.length > 0 ? (
                availableFolders.map((folder: { id: string; name: string }) => (
                  <MenuItem
                    key={folder.id}
                    onClick={() => {
                      popupState.close();
                      if (onMoveToFolder) onMoveToFolder(id, folder.id);
                    }}
                  >
                    {folder.name}
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>There are no folders</MenuItem>
              )}
            </Menu>
          </>
        );
      }}
    </PopupState>
  );

  const hideFromAllNotesPopup = () => (
    <PopupState variant="popover" popupId={`hide-from-notes-${id}`}>
      {(popupState) => {
        return (
          <>
            <IconButton {...bindTrigger(popupState)}>
              <ThreeDotMenuIcon />
            </IconButton>
            <Menu {...bindMenu(popupState)}>
              <MenuItem
                onClick={() => {
                  popupState.close();
                  if (onHide) onHide(id);
                }}
              >
                {!isHidden
                  ? `Hide from ${DEFAULT_CATEGORY}`
                  : `Show in ${DEFAULT_CATEGORY}`}
              </MenuItem>
            </Menu>
          </>
        );
      }}
    </PopupState>
  );

  return (
    <Box className="box">
      <Card
        className="box__card"
        variant="outlined"
        onClick={onSelect ? () => onSelect(id) : undefined}
        data-active={selected ? "true" : undefined}
        sx={
          selected
            ? (theme) => ({
                backgroundColor: alpha(theme.palette.primary.main, 0.3),
              })
            : {}
        }
      >
        <CardContent>
          <Typography variant="h5" component="div" className="box__text">
            {getFirstLine(text)}
          </Typography>
          <Typography variant="body2" className="box__text">
            {category}
          </Typography>
        </CardContent>
        <CardActions>
          {!isTrash && (
            <>
              <IconButton onClick={onFav ? () => onFav(id) : undefined}>
                {isFav ? (
                  <StarIcon sx={{ color: yellow[700] }} />
                ) : (
                  <StarredIcon />
                )}
              </IconButton>
              {moveToFolderPopup()}
              {category !== DEFAULT_CATEGORY ? hideFromAllNotesPopup() : null}
              <IconButton
                onClick={
                  onTrash
                    ? (e) => {
                        e.stopPropagation();
                        onTrash(id);
                      }
                    : undefined
                }
                style={{ marginLeft: "auto" }}
              >
                <DeleteOutlineIcon />
              </IconButton>
            </>
          )}
          {isTrash && (
            <IconButton
              onClick={
                onRestore
                  ? (e) => {
                      e.stopPropagation();
                      onRestore(id);
                    }
                  : undefined
              }
            >
              <RestoreIcon />
            </IconButton>
          )}
        </CardActions>
      </Card>
    </Box>
  );
};

export default CustomCard;
