import type { Assignment, MatchDraft, Notes } from "../types/formation";

/**
 * Whether a draft differs from what the server has stored.
 * Compares contents rather than tracking a flag, so dragging someone away and
 * back counts as no change. Sixty keys per comparison is cheap enough to run
 * on every render.
 * @param draft - Draft for this battle, undefined when it was never touched
 * @param saved - Assignment as last read from the server
 * @returns true when the draft holds unsaved changes
 */
export function isDirty(
  draft: Assignment | undefined,
  saved: Assignment
): boolean {
  if (!draft) return false;

  const keys = new Set([...Object.keys(draft), ...Object.keys(saved)]);

  for (const key of keys) {
    if ((draft[key] ?? null) !== (saved[key] ?? null)) return true;
  }

  return false;
}

/**
 * Whether two note maps differ. A slot with nothing written carries no key, so
 * a key holding "" counts as the same thing as no key at all — typing into a
 * note and clearing it again must not leave the day dirty.
 * @param draft - Notes of the draft match
 * @param saved - Notes as last read from the server
 * @returns true when the two differ
 */
function notesDiffer(draft: Notes, saved: Notes): boolean {
  const keys = new Set([...Object.keys(draft), ...Object.keys(saved)]);

  for (const key of keys) {
    if ((draft[key] ?? "").trim() !== (saved[key] ?? "").trim()) return true;
  }

  return false;
}

/**
 * Whether a day's draft differs from what the server has stored.
 * The save button covers the whole day, so dirtiness has to as well — including
 * a match 2 that was just added or just removed, and notes as much as people.
 * @param draft - Draft for the day, undefined when it was never touched
 * @param saved - Matches as last read from the server
 * @returns true when the day holds unsaved changes
 */
export function isDayDirty(
  draft: MatchDraft[] | undefined,
  saved: MatchDraft[]
): boolean {
  if (!draft) return false;
  if (draft.length !== saved.length) return true;

  return draft.some(
    (match, index) =>
      isDirty(match.assignment, saved[index].assignment) ||
      notesDiffer(match.notes, saved[index].notes)
  );
}
