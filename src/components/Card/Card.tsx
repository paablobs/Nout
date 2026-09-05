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

import { DEFAULT_CATEGORY } from "../../utils/constants";
import { getPreviewText } from "../../utils/notePreview";
import { formatRelativeTime } from "../../utils/formatRelativeTime";
import "./Card.css";

interface CustomCardProps {
  id: string;
  text: string;
  isFav?: boolean;
  isTrash?: boolean;
  isHidden?: boolean;
  updatedAt: number;
  trashedAt?: number;
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
  isFav,
  isTrash,
  isHidden,
  updatedAt,
  trashedAt,
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
  const moveToFolderPopup = () => (
    <PopupState variant="popover" popupId={`move-folder-popup-${id}`}>
      {(popupState) => {
        const availableFolders = (folders || []).filter(
          (f) => f.id !== folderId,
        );
        return (
          <>
            <IconButton
              data-testid={`move-folder-btn-${id}`}
              aria-label="Move note to folder"
              {...bindTrigger(popupState)}
            >
              <MoveToFolderIcon />
            </IconButton>
            <Menu {...bindMenu(popupState)}>
              {availableFolders.length > 0 ? (
                availableFolders.map((folder: { id: string; name: string }) => (
                  <MenuItem
                    key={folder.id}
                    data-testid={`move-to-folder-${folder.name}`}
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
            <IconButton
              data-testid={`three-dot-btn-${id}`}
              aria-label={
                isHidden ? "Show note in Notes" : "Hide note from Notes"
              }
              {...bindTrigger(popupState)}
            >
              <ThreeDotMenuIcon />
            </IconButton>
            <Menu {...bindMenu(popupState)}>
              <MenuItem
                data-testid={`hide-note-${id}`}
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

  const folderLabel =
    folders?.find((folder) => folder.id === folderId)?.name ?? DEFAULT_CATEGORY;
  const editedLabel = formatRelativeTime(updatedAt);
  const metaLine = isTrash
    ? trashedAt
      ? `Trashed ${formatRelativeTime(trashedAt)}`
      : "Trashed"
    : editedLabel
      ? `${folderLabel} · edited ${editedLabel}`
      : folderLabel;

  return (
    <Box className="box" data-testid={`note-card-${id}`}>
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
            {getPreviewText(text)}
          </Typography>
          <Typography variant="body2" className="box__text">
            {metaLine}
          </Typography>
        </CardContent>
        <CardActions>
          {!isTrash && (
            <>
              <IconButton
                data-testid={`fav-btn-${id}`}
                aria-label={
                  isFav ? "Remove from favorites" : "Add to favorites"
                }
                onClick={onFav ? () => onFav(id) : undefined}
              >
                {isFav ? (
                  <StarIcon sx={{ color: yellow[700] }} />
                ) : (
                  <StarredIcon />
                )}
              </IconButton>
              {moveToFolderPopup()}
              {folderId ? hideFromAllNotesPopup() : null}
              <IconButton
                data-testid={`trash-btn-${id}`}
                aria-label="Move note to trash"
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
              data-testid={`restore-btn-${id}`}
              aria-label="Restore note"
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
