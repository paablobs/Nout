import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import NotesIcon from "@mui/icons-material/NotesOutlined";
import StarIcon from "@mui/icons-material/StarOutline";
import FolderIcon from "@mui/icons-material/FolderOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import ScratchpadIcon from "@mui/icons-material/DashboardCustomizeOutlined";
import { selectedView, type SelectedView } from "../../../utils/selectedView";

interface BottomNavProps {
  currentView: SelectedView;
  onViewChange: (view: SelectedView) => void;
}

const TABS: {
  view: SelectedView;
  label: string;
  icon: React.ReactNode;
  testId: string;
}[] = [
  {
    view: selectedView.NOTES,
    label: "Notes",
    icon: <NotesIcon />,
    testId: "nav-notes",
  },
  {
    view: selectedView.FAVORITES,
    label: "Favorites",
    icon: <StarIcon />,
    testId: "nav-favorites",
  },
  {
    view: selectedView.FOLDERS,
    label: "Folders",
    icon: <FolderIcon />,
    testId: "nav-folders",
  },
  {
    view: selectedView.TRASH,
    label: "Trash",
    icon: <DeleteIcon />,
    testId: "nav-trash",
  },
  {
    view: selectedView.SCRATCHPAD,
    label: "Scratchpad",
    icon: <ScratchpadIcon />,
    testId: "nav-scratchpad",
  },
];

const BottomNav = ({ currentView, onViewChange }: BottomNavProps) => {
  const currentIndex = TABS.findIndex((tab) => tab.view === currentView);

  return (
    <BottomNavigation
      data-testid="bottom-nav"
      showLabels
      value={currentIndex >= 0 ? currentIndex : 0}
      onChange={(_event, newValue) => {
        onViewChange(TABS[newValue].view);
      }}
      sx={{ flexShrink: 0 }}
    >
      {TABS.map((tab) => (
        <BottomNavigationAction
          key={tab.view}
          label={tab.label}
          icon={tab.icon}
          data-testid={tab.testId}
        />
      ))}
    </BottomNavigation>
  );
};

export default BottomNav;
