import { IconButton, InputAdornment, TextField } from "@mui/material";
import { Clear as ClearIcon, Search as SearchIcon } from "@mui/icons-material";

interface SearchNotesFieldProps {
  value: string;
  onChange: (value: string) => void;
}

const SearchNotesField = ({ value, onChange }: SearchNotesFieldProps) => (
  <TextField
    placeholder="Search notes"
    size="small"
    fullWidth
    value={value}
    onChange={(event) => onChange(event.target.value)}
    slotProps={{
      htmlInput: { "data-testid": "notes-search-input" },
      input: {
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
        ),
        endAdornment: value ? (
          <InputAdornment position="end">
            <IconButton
              data-testid="notes-search-clear"
              aria-label="Clear search"
              size="small"
              onClick={() => onChange("")}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : undefined,
      },
    }}
  />
);

export default SearchNotesField;
