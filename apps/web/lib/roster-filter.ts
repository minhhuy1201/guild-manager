import type { GuildClass } from "@guild/shared/enums";
import type { Character } from "@guild/shared/schemas";

/**
 * The two fields the roster filter reads off a character.
 * Spelled as a `Pick` so the contract stays "these two and nothing else"
 * even if `Character` grows, and so any object of that shape — the team
 * builder's `PoolCandidate` included — can be passed in.
 */
export type RosterCandidate = Pick<Character, "name" | "guildClass">;

/** Roster filter: a keyword and a set of guild classes. */
export interface RosterFilter {
  /** Raw keyword as typed; the predicate trims and lowercases it itself. */
  search: string;
  /** Guild classes to keep. An empty array means every class. */
  guildClasses: GuildClass[];
}

/**
 * Whether the filter narrows the roster at all.
 * The keyword is trimmed here for the same reason `matchesRosterFilter` trims it: a box holding
 * only spaces keeps every character, so it is not a filter the user can be asked to clear.
 * @param filter - Filter currently applied
 * @returns True when at least one half of the filter is set
 */
export function isRosterFilterActive(filter: RosterFilter): boolean {
  return filter.search.trim().length > 0 || filter.guildClasses.length > 0;
}

/**
 * Whether a character passes the roster filter.
 * The keyword matches on NAME only; both sides are lowercased before comparing,
 * because people type whatever case they like. The in-game id is deliberately
 * not searched: it is never shown in any list, so a match on it looks like a
 * random result to the person typing.
 * @param character - Character under test (only name and guildClass are read)
 * @param filter - Filter currently applied
 * @returns True when the character passes both halves of the filter
 */
export function matchesRosterFilter(
  character: RosterCandidate,
  filter: RosterFilter
): boolean {
  if (
    filter.guildClasses.length > 0 &&
    !filter.guildClasses.includes(character.guildClass)
  ) {
    return false;
  }

  const keyword = filter.search.trim().toLowerCase();
  if (keyword.length === 0) return true;

  return character.name.toLowerCase().includes(keyword);
}
