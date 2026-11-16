import {
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { blue } from "@mui/material/colors";
import {
  ACCENT_PRESETS,
  DEFAULT_ACCENT,
  DEFAULT_SECONDARY,
} from "../../../utils/accentTheme";

interface SettingsDialogProps {
  isOpen: boolean;
  fullScreen?: boolean;
  accent: string;
  onAccentChange: (accent: string) => void;
  onClose: () => void;
}

const SWATCH_SIZE = 40;

// Shows both colors of the original palette: MUI's default primary and the
// default green action color.
const DEFAULT_SWATCH_BACKGROUND = `linear-gradient(135deg, ${blue[200]} 50%, ${DEFAULT_SECONDARY} 50%)`;

interface SwatchProps {
  label: string;
  background: string;
  selected: boolean;
  testId: string;
  onSelect: () => void;
}

const Swatch = ({
  label,
  background,
  selected,
  testId,
  onSelect,
}: SwatchProps) => (
  <ButtonBase
    data-testid={testId}
    aria-label={label}
    aria-pressed={selected}
    title={label}
    onClick={onSelect}
    sx={{
      width: SWATCH_SIZE,
      height: SWATCH_SIZE,
      borderRadius: "50%",
      background,
      border: 2,
      borderColor: selected ? "text.primary" : "transparent",
      outline: selected ? 0 : "1px solid rgba(255, 255, 255, 0.2)",
      outlineOffset: -2,
    }}
  />
);

const SettingsDialog = ({
  isOpen,
  fullScreen,
  accent,
  onAccentChange,
  onClose,
}: SettingsDialogProps) => {
  const isDefault = accent === DEFAULT_ACCENT;
  const isCustom =
    !isDefault && !ACCENT_PRESETS.some((preset) => preset.value === accent);

  return (
    <Dialog
      data-testid="settings-dialog"
      open={isOpen}
      onClose={onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="xs"
      aria-labelledby="settings-dialog-title"
    >
      <DialogTitle id="settings-dialog-title">Settings</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle2" component="h3" gutterBottom>
          Accent color
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          <Swatch
            testId="accent-default"
            label="Default"
            background={DEFAULT_SWATCH_BACKGROUND}
            selected={isDefault}
            onSelect={() => onAccentChange(DEFAULT_ACCENT)}
          />
          {ACCENT_PRESETS.map((preset) => (
            <Swatch
              key={preset.value}
              testId={`accent-${preset.name.toLowerCase()}`}
              label={preset.name}
              background={preset.value}
              selected={accent === preset.value}
              onSelect={() => onAccentChange(preset.value)}
            />
          ))}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 2.5 }}>
          {/* Uncontrolled on purpose: React's onChange fires on every drag
              step of a color input. The native change event fires once the
              pick is committed. Keyed on the stored accent so a preset or
              reset remounts it with the new value. */}
          <Box
            component="input"
            type="color"
            key={accent}
            id="accent-custom"
            data-testid="accent-custom-input"
            aria-label="Custom accent color"
            defaultValue={isDefault ? blue[200] : accent}
            ref={(el: HTMLInputElement | null) => {
              if (!el) return;
              const handleCommit = () => onAccentChange(el.value);
              el.addEventListener("change", handleCommit);
              return () => el.removeEventListener("change", handleCommit);
            }}
            sx={{
              width: SWATCH_SIZE,
              height: SWATCH_SIZE,
              padding: 0,
              border: 2,
              borderColor: isCustom ? "text.primary" : "transparent",
              borderRadius: "50%",
              background: "none",
              cursor: "pointer",
              "&::-webkit-color-swatch-wrapper": { padding: 0 },
              "&::-webkit-color-swatch": { border: 0, borderRadius: "50%" },
              "&::-moz-color-swatch": { border: 0, borderRadius: "50%" },
            }}
          />
          <Typography
            component="label"
            htmlFor="accent-custom"
            variant="body2"
            color={isCustom ? "text.primary" : "text.secondary"}
          >
            Custom color
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          data-testid="accent-reset"
          onClick={() => onAccentChange(DEFAULT_ACCENT)}
          disabled={isDefault}
        >
          Reset to default
        </Button>
        <Button data-testid="settings-close" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsDialog;
