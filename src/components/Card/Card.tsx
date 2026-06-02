import { forwardRef, type KeyboardEvent } from "react";
import Card from "@mui/material/Card";
import Box from "@mui/material/Box";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
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

import {
  DEFAULT_CATEGORY,
  isDefaultCategory,
  toDisplayCategory,
} from "../../utils/constants";
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

const CustomCard = forwardRef<HTMLDivElement, CustomCardProps>(
  function CustomCard(
    {
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
    },
    ref,
  ) {
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

    const titleLine = getFirstLine(text);
    const isSelectable = Boolean(onSelect);

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (!isSelectable) return;
      if (event.target !== event.currentTarget) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect?.(id);
      }
    };

    const moveToFolderPopup = () => (
      <PopupState variant="popover" popupId={`move-folder-popup-${id}`}>
        {(popupState) => {
          const availableFolders = (folders || []).filter(
            (f) => f.id !== folderId,
          );
          return (
            <>
              <Tooltip title="Move to folder">
                <IconButton
                  data-testid={`move-folder-btn-${id}`}
                  aria-label="Move to folder"
                  {...bindTrigger(popupState)}
                >
                  <MoveToFolderIcon aria-hidden="true" />
                </IconButton>
              </Tooltip>
              <Menu {...bindMenu(popupState)}>
                {availableFolders.length > 0 ? (
                  availableFolders.map(
                    (folder: { id: string; name: string }) => (
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
                    ),
                  )
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
              <Tooltip title="More actions">
                <IconButton
                  data-testid={`three-dot-btn-${id}`}
                  aria-label="More actions"
                  {...bindTrigger(popupState)}
                >
                  <ThreeDotMenuIcon aria-hidden="true" />
                </IconButton>
              </Tooltip>
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

    return (
      <Box
        ref={ref}
        className="box"
        data-testid={`note-card-${id}`}
        role={isSelectable ? "button" : undefined}
        tabIndex={isSelectable ? 0 : -1}
        aria-pressed={isSelectable ? selected : undefined}
        aria-label={isSelectable ? `Open note: ${titleLine}` : undefined}
        onClick={onSelect ? () => onSelect(id) : undefined}
        onKeyDown={handleKeyDown}
      >
        <Card
          className="box__card"
          variant="outlined"
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
              {titleLine}
            </Typography>
            <Typography variant="body2" className="box__text">
              {toDisplayCategory(category)}
            </Typography>
          </CardContent>
          <CardActions>
            {!isTrash && (
              <>
                <Tooltip
                  title={isFav ? "Remove from favorites" : "Add to favorites"}
                >
                  <IconButton
                    data-testid={`fav-btn-${id}`}
                    aria-label={
                      isFav ? "Remove from favorites" : "Add to favorites"
                    }
                    aria-pressed={isFav}
                    onClick={
                      onFav
                        ? (e) => {
                            e.stopPropagation();
                            onFav(id);
                          }
                        : undefined
                    }
                  >
                    {isFav ? (
                      <StarIcon
                        aria-hidden="true"
                        sx={{ color: yellow[700] }}
                      />
                    ) : (
                      <StarredIcon aria-hidden="true" />
                    )}
                  </IconButton>
                </Tooltip>
                {moveToFolderPopup()}
                {!isDefaultCategory(category) ? hideFromAllNotesPopup() : null}
                <Tooltip title="Move to trash">
                  <IconButton
                    data-testid={`trash-btn-${id}`}
                    aria-label="Move to trash"
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
                    <DeleteOutlineIcon aria-hidden="true" />
                  </IconButton>
                </Tooltip>
              </>
            )}
            {isTrash && (
              <Tooltip title="Restore from trash">
                <IconButton
                  data-testid={`restore-btn-${id}`}
                  aria-label="Restore from trash"
                  onClick={
                    onRestore
                      ? (e) => {
                          e.stopPropagation();
                          onRestore(id);
                        }
                      : undefined
                  }
                >
                  <RestoreIcon aria-hidden="true" />
                </IconButton>
              </Tooltip>
            )}
          </CardActions>
        </Card>
      </Box>
    );
  },
);

export default CustomCard;
