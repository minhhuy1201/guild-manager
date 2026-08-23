import type { GuildClass } from "@guild/shared/enums";
import type { Character } from "@guild/shared/schemas";

/**
 * The three fields the roster filter reads off a character.
 * Spelled as a `Pick` so the contract stays "these three and nothing else"
 * even if `Character` grows, and so any object of that shape — the team
 * builder's `PoolCandidate` included — can be passed in.
 */
export type RosterCandidate = Pick<Character, "id" | "name" | "guildClass">;

/** Bộ lọc danh sách nhân vật: từ khoá và lưu phái. */
export interface RosterFilter {
  /** Raw keyword as typed; the predicate trims and lowercases it itself. */
  search: string;
  /** Guild classes to keep. An empty array means every class. */
  guildClasses: GuildClass[];
}

/**
 * Whether a character passes the roster filter.
 * The keyword matches on NAME or in-game ID; both sides are lowercased before
 * comparing, because people type whatever case they like. An id is a Vietnamese
 * slug, so searching by id is what tells two same-named members apart.
 * @param character - Character under test (only id, name and guildClass are read)
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

  return (
    character.name.toLowerCase().includes(keyword) ||
    character.id.toLowerCase().includes(keyword)
  );
}
