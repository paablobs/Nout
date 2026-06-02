export const DEFAULT_CATEGORY = "Notes";
const LEGACY_DEFAULT_CATEGORY = "All notes";

export const isDefaultCategory = (category: string) =>
  category === DEFAULT_CATEGORY || category === LEGACY_DEFAULT_CATEGORY;

export const toDisplayCategory = (category: string) =>
  isDefaultCategory(category) ? DEFAULT_CATEGORY : category;

export const DEFAULT_SCRATCHPAD_CONTENT =
  "Welcome to Nout!\n\nThis is your scratchpad. You can write down quick notes here that won't be saved permanently.\n\nFeel free to type anything you want, and it will be saved automatically as you type.";
