/**
 * The Announcement note as a Discord quote block, one entry per line.
 *
 * An empty line becomes a bare `>` so the quote stays one block instead of splitting in two.
 *
 * @param note - The trimmed note, null when there is none
 * @returns The quoted lines, empty when there is no note
 */
export function noteQuoteLines(note: string | null): string[] {
  if (note === null) return [];

  return note
    .split(/\r?\n/)
    .map((line) => (line.trim() === '' ? '>' : `> ${line.trimEnd()}`));
}
