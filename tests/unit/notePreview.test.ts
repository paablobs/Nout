import { describe, expect, it } from "vitest";
import { getPreviewText, stripHtml } from "../../src/utils/notePreview";

describe("notePreview", () => {
  it("strips html tags", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("\nHello \nworld\n\n");
  });

  it("uses the first non-empty line as the preview", () => {
    expect(getPreviewText("<p><h1></h1></p><p>First real line</p>")).toBe(
      "First real line",
    );
  });

  it("falls back to New note for empty content", () => {
    expect(getPreviewText("")).toBe("New note");
    expect(getPreviewText("<p></p>")).toBe("New note");
  });
});
