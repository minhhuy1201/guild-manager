import type { GuildClass } from "@guild/shared/enums";

import { matchesRosterFilter, type RosterFilter } from "@/lib/roster-filter";
import type { Assignment } from "../types/formation";

/** Minimal shape the pool needs from a character. */
export interface PoolCandidate {
  /** In-game id */
  id: string;
  /** Character name */
  name: string;
  /** Guild class */
  guildClass: GuildClass;
}

/**
 * Derive the pool: everyone not currently placed in the formation, then
 * narrowed by the filters. Nothing is stored — this runs on every render, so
 * the pool can never drift out of sync with the assignment.
 *
 * Only the "already placed" half lives here; the keyword and class halves are
 * the shared `matchesRosterFilter`, so this screen cannot drift from the others.
 * @param characters - Full guild roster
 * @param assignment - Current slot assignment
 * @param filter - Search keyword and guild class filter
 * @returns Characters still available, in roster order
 */
export function selectPoolCharacters<T extends PoolCandidate>(
  characters: T[],
  assignment: Assignment,
  filter: RosterFilter
): T[] {
  const assignedIds = new Set(
    Object.values(assignment).filter((id): id is string => id !== null)
  );

  return characters.filter(
    (character) =>
      !assignedIds.has(character.id) && matchesRosterFilter(character, filter)
  );
}
