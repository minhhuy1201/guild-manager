/**
 * Clamp the open sub-tab to a match that actually exists.
 * The index is kept as one value across days, so switching from a day with two
 * matches to a day with one would otherwise point at nothing.
 * @param matchCount - How many matches the open day has
 * @param stored - Sub-tab index remembered in the store
 * @returns A valid match index, 0 when nothing else fits
 */
export function resolveActiveMatchIndex(
  matchCount: number,
  stored: number
): number {
  if (stored < 0 || stored >= matchCount) return 0;

  return stored;
}
