import { useState } from "react";
import { alpha } from "@mui/material";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { yellow } from "@mui/material/colors";
import {
  DeleteOutlineOutlined as DeleteOutlineIcon,
  PendingOutlined as ThreeDotMenuIcon,
  RestoreOutlined as RestoreIcon,
  Star as StarIcon,
  StarBorder as StarredIcon,
} from "@mui/icons-material";

import { DEFAULT_CATEGORY } from "../../utils/constants";
import { getPreviewText } from "../../utils/notePreview";
import { formatRelativeTime } from "../../utils/formatRelativeTime";
import type { CustomCardProps } from "./Card.types";

const CompactCard = ({
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
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const moveTargets = (folders || []).filter(
    (folder) => folder.id !== folderId,
  );
  const canMove = Boolean(onMoveToFolder) && moveTargets.length > 0;
  const canHide = Boolean(folderId && onHide);
  const hasMenuItems = canMove || canHide;
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
        onClick={
          onSelect
            ? (event) => {
                if (menuAnchor) return;
                const target = event.target as HTMLElement;
                if (target.closest("button, [role='menuitem']")) return;
                onSelect(id);
              }
            : undefined
        }
        data-active={selected ? "true" : undefined}
        sx={
          selected
            ? (theme) => ({
                backgroundColor: alpha(theme.palette.primary.main, 0.3),
              })
            : {}
        }
      >
        <CardContent sx={{ pb: "4px !important" }}>
          <Typography
            variant="subtitle1"
            component="div"
            className="box__text"
            noWrap
          >
            {getPreviewText(text)}
          </Typography>
          <Typography variant="caption" className="box__text" noWrap>
            {metaLine}
          </Typography>
        </CardContent>
        <CardActions sx={{ pt: 0, minHeight: 0 }}>
          {!isTrash && (
            <>
              <IconButton
                data-testid={`fav-btn-${id}`}
                aria-label={
                  isFav ? "Remove from favorites" : "Add to favorites"
                }
                onClick={
                  onFav
                    ? (event) => {
                        event.stopPropagation();
                        onFav(id);
                      }
                    : undefined
                }
                size="small"
                sx={{ width: 44, height: 44 }}
              >
                {isFav ? (
                  <StarIcon sx={{ color: yellow[700] }} />
                ) : (
                  <StarredIcon />
                )}
              </IconButton>
              <Box sx={{ flex: 1 }} />
              {hasMenuItems && (
                <>
                  <IconButton
                    data-testid={`three-dot-btn-${id}`}
                    aria-label="More actions"
                    size="small"
                    sx={{ width: 44, height: 44 }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuAnchor(event.currentTarget);
                    }}
                  >
                    <ThreeDotMenuIcon />
                  </IconButton>
                  <Menu
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={() => {
                      setMenuAnchor(null);
                      setFolderPickerOpen(false);
                    }}
                  >
                    {!folderPickerOpen
                      ? [
                          ...(canMove
                            ? [
                                <MenuItem
                                  key="move-folder"
                                  data-testid={`move-folder-menu-${id}`}
                                  onClick={() => setFolderPickerOpen(true)}
                                >
                                  Move to folder
                                </MenuItem>,
                              ]
                            : []),
                          ...(canHide
                            ? [
                                <MenuItem
                                  key="hide-note"
                                  data-testid={`hide-note-${id}`}
                                  onClick={() => {
                                    setMenuAnchor(null);
                                    setFolderPickerOpen(false);
                                    onHide?.(id);
                                  }}
                                >
                                  {isHidden
                                    ? `Show in ${DEFAULT_CATEGORY}`
                                    : `Hide from ${DEFAULT_CATEGORY}`}
                                </MenuItem>,
                              ]
                            : []),
                        ]
                      : moveTargets.map((folder) => (
                          <MenuItem
                            key={folder.id}
                            data-testid={`move-to-folder-${folder.name}`}
                            onClick={() => {
                              setMenuAnchor(null);
                              setFolderPickerOpen(false);
                              onMoveToFolder?.(id, folder.id);
                            }}
                          >
                            {folder.name}
                          </MenuItem>
                        ))}
                  </Menu>
                </>
              )}
              <IconButton
                data-testid={`trash-btn-${id}`}
                aria-label="Move note to trash"
                onClick={
                  onTrash
                    ? (event) => {
                        event.stopPropagation();
                        onTrash(id);
                      }
                    : undefined
                }
                size="small"
                sx={{ width: 44, height: 44 }}
              >
                <DeleteOutlineIcon />
              </IconButton>
            </>
          )}
          {isTrash && (
            <IconButton
              data-testid={`restore-btn-${id}`}
              aria-label="Restore note"
              size="small"
              sx={{ width: 44, height: 44 }}
              onClick={
                onRestore
                  ? (event) => {
                      event.stopPropagation();
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

export default CompactCard;
