import { GUILD_CLASS_OPTIONS, type GuildClass } from "@guild/shared/enums";

import { matchesRosterFilter, type RosterFilter } from "@/lib/roster-filter";
import type { Assignment } from "../types/formation";

/** How many members of one guild class are left to place. */
export interface GuildClassCount {
  /** The class */
  guildClass: GuildClass;
  /** Members of that class, always above zero */
  count: number;
}

/**
 * Count the members left to place per guild class, for the pool's class chips.
 * In `GUILD_CLASS_OPTIONS` order so the chips never reshuffle as people are placed;
 * a class with nobody left is dropped, since its chip could only filter to nothing.
 * @param characters - Members to count, usually the unfiltered pool
 * @returns One entry per class that still has someone
 */
export function countByGuildClass(
  characters: PoolCandidate[]
): GuildClassCount[] {
  const counts = new Map<GuildClass, number>();

  for (const character of characters) {
    counts.set(character.guildClass, (counts.get(character.guildClass) ?? 0) + 1);
  }

  return GUILD_CLASS_OPTIONS.flatMap((guildClass) => {
    const count = counts.get(guildClass);
    return count ? [{ guildClass, count }] : [];
  });
}

/**
 * Add a class to the filter, or take it out when it is already there.
 * @param selected - Classes currently filtered
 * @param guildClass - Class whose chip was pressed
 * @returns A new array; `selected` is left untouched
 */
export function toggleGuildClass(
  selected: GuildClass[],
  guildClass: GuildClass
): GuildClass[] {
  return selected.includes(guildClass)
    ? selected.filter((item) => item !== guildClass)
    : [...selected, guildClass];
}

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
