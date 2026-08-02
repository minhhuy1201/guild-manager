import type { GuildClass } from "@shared/enums";

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

/** Current pool filter values. */
export interface PoolFilter {
  /** Free-text search over name and in-game id */
  search: string;
  /** Guild classes to keep. An empty array means every class. */
  guildClasses: GuildClass[];
}

/**
 * Derive the pool: everyone not currently placed in the formation, then
 * narrowed by the filters. Nothing is stored — this runs on every render, so
 * the pool can never drift out of sync with the assignment.
 * @param characters - Full guild roster
 * @param assignment - Current slot assignment
 * @param filter - Search keyword and guild class filter
 * @returns Characters still available, in roster order
 */
export function selectPoolCharacters<T extends PoolCandidate>(
  characters: T[],
  assignment: Assignment,
  filter: PoolFilter
): T[] {
  const assignedIds = new Set(
    Object.values(assignment).filter((id): id is string => id !== null)
  );
  const keyword = filter.search.trim().toLowerCase();

  return characters.filter((character) => {
    if (assignedIds.has(character.id)) return false;

    if (
      filter.guildClasses.length > 0 &&
      !filter.guildClasses.includes(character.guildClass)
    ) {
      return false;
    }

    if (keyword.length === 0) return true;

    return (
      character.name.toLowerCase().includes(keyword) ||
      character.id.toLowerCase().includes(keyword)
    );
  });
}
