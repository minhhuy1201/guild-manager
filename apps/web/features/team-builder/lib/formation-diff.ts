import type { Assignment } from "../types/formation";

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
