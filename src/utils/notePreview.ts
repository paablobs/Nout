export function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "\n");
}

export function getPreviewText(html: string): string {
  const plain = stripHtml(html).trim();
  if (!plain) return "New note";
  const lines = plain.split(/\r?\n/).flatMap((l) => {
    const trimmed = l.trim();
    return trimmed ? [trimmed] : [];
  });
  return lines.length ? lines[0] : "New note";
}
