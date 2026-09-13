import type { Assignment, MatchDraft, Notes } from "../types/formation";

/**
 * How many slots hold a different person in the draft than on the server.
 * Compares contents rather than tracking a flag, so dragging someone away and
 * back counts as no change. Sixty keys per comparison is cheap enough to run
 * on every render.
 * @param draft - Assignment of the draft match
 * @param saved - Assignment as last read from the server
 * @returns Number of slots that differ
 */
function countSlotChanges(draft: Assignment, saved: Assignment): number {
  const keys = new Set([...Object.keys(draft), ...Object.keys(saved)]);
  let count = 0;

  for (const key of keys) {
    if ((draft[key] ?? null) !== (saved[key] ?? null)) count += 1;
  }

  return count;
}

/**
 * How many slot notes differ. A slot with nothing written carries no key, so
 * a key holding "" counts as the same thing as no key at all — typing into a
 * note and clearing it again must not leave the day dirty.
 * @param draft - Notes of the draft match
 * @param saved - Notes as last read from the server
 * @returns Number of notes that differ
 */
function countNoteChanges(draft: Notes, saved: Notes): number {
  const keys = new Set([...Object.keys(draft), ...Object.keys(saved)]);
  let count = 0;

  for (const key of keys) {
    if ((draft[key] ?? "").trim() !== (saved[key] ?? "").trim()) count += 1;
  }

  return count;
}

/**
 * How many edits separate a day's draft from what the server has stored: one
 * per slot holding someone else, one per note, and one for a match 2 added or
 * removed. The match itself counts once rather than slot by slot - a new match
 * 2 starts as a copy of match 1, and "twelve changes" for one button press
 * would read as a mistake.
 * @param draft - Draft for the day, undefined when it was never touched
 * @param saved - Matches as last read from the server
 * @returns Number of unsaved edits, 0 when the day is clean
 */
export function countDayChanges(
  draft: MatchDraft[] | undefined,
  saved: MatchDraft[]
): number {
  if (!draft) return 0;

  const shared = Math.min(draft.length, saved.length);
  let count = draft.length === saved.length ? 0 : 1;

  for (let index = 0; index < shared; index += 1) {
    count +=
      countSlotChanges(draft[index].assignment, saved[index].assignment) +
      countNoteChanges(draft[index].notes, saved[index].notes);
  }

  return count;
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
  return countDayChanges(draft, saved) > 0;
}
