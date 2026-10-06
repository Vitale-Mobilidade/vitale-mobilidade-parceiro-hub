/** Greedy word wrap. Returns null when the text does not fit in maxLines (caller shrinks the font). */
export function wrapTitle(
  text: string,
  measure: (s: string) => number,
  maxWidth: number,
  maxLines: number,
): string[] | null {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (measure(next) <= maxWidth) {
      line = next;
      continue;
    }
    if (!line || measure(word) > maxWidth) return null; // a single word never gets cut or hyphenated
    lines.push(line);
    line = word;
    if (lines.length >= maxLines) return null;
  }
  if (line) lines.push(line);
  return lines.length <= maxLines ? lines : null;
}

/** Largest font size (step 4px) whose wrap fits; the exact title is never truncated. */
export function fitTitle(
  text: string,
  measureAt: (s: string, size: number) => number,
  maxWidth: number,
  maxLines = 3,
  sizes: number[] = [76, 72, 68, 64, 60, 56, 52, 48, 44, 40, 36],
): { size: number; lines: string[] } | null {
  for (const size of sizes) {
    const lines = wrapTitle(
      text,
      (s) => measureAt(s, size),
      maxWidth,
      maxLines,
    );
    if (lines) return { size, lines };
  }
  return null;
}
