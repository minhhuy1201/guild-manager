import type { TeamNames } from "@guild/shared/schemas";

/**
 * How many teams carry a different name in the draft than on the server.
 * A team with no name has no key, so clearing a name and naming a new team
 * each count once, the same as a rename.
 * @param draft - Names currently shown
 * @param saved - Names as last read from the server
 * @returns Number of teams whose name differs, 0 when nothing changed
 */
export function countNameChanges(draft: TeamNames, saved: TeamNames): number {
  const keys = new Set([...Object.keys(draft), ...Object.keys(saved)]);
  let count = 0;

  for (const key of keys) {
    if (draft[key] !== saved[key]) count += 1;
  }

  return count;
}
