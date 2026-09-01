import type { MatchDraft } from "../types/formation";

/**
 * Whether anyone at all stands in a match.
 * @param match - The match being judged
 * @returns true when at least one slot holds a character
 */
function hasMembers(match: MatchDraft): boolean {
  return Object.values(match.assignment).some(Boolean);
}

/**
 * The line-up a day offers to be copied: its last match, and only while someone
 * stands in it. Judging the same match that would be copied is the point — a day
 * whose match 2 was emptied has nothing to offer, however full its match 1 is.
 * @param matches - Matches of the day, in order
 * @returns The last match when it holds someone, null otherwise
 */
export function lastLineUp(matches: MatchDraft[]): MatchDraft | null {
  const last = matches[matches.length - 1];

  return last && hasMembers(last) ? last : null;
}

/**
 * Drop a second match that holds nobody. A day is two matches only while both
 * are actually played, so an empty match 2 is not a match — it is a leftover of
 * one that was set up and then cleared.
 *
 * Notes go with it: "nobody stands here" is the whole test, so a match 2 holding
 * only notes is dropped along with them.
 * @param matches - Matches of the day, in order
 * @returns The same matches, minus an empty match 2
 */
export function withoutEmptySecondMatch(matches: MatchDraft[]): MatchDraft[] {
  if (matches.length < 2 || hasMembers(matches[1])) return matches;

  return [matches[0]];
}
