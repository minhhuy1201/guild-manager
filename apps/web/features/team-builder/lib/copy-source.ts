import type { MatchDraft } from "../types/formation";

/** One battle day offered as a copy source, with the matches currently shown for it. */
export interface CopyCandidate {
  /** Id of the battle */
  sessionId: string;
  /** Display label of the battle, e.g. "Thứ 7 · Bang Chiến" */
  label: string;
  /** Matches of that day — the draft where one exists, the saved copy otherwise */
  matches: MatchDraft[];
}

/** The match a copy would be taken from. */
export interface CopySource {
  /** Id of the battle it comes from */
  sessionId: string;
  /** Label naming the day, and the match too when that day holds more than one */
  label: string;
  /** The match itself */
  match: MatchDraft;
}

/**
 * Whether a day holds a line-up worth copying. Judged by the PEOPLE placed, not
 * the notes: a day carrying only notes has nothing to copy across.
 * @param candidate - The day being judged
 * @returns true when at least one slot of one match holds someone
 */
function hasLineUp(candidate: CopyCandidate): boolean {
  return candidate.matches.some((match) =>
    Object.values(match.assignment).some(Boolean)
  );
}

/**
 * Turn a day into the source it offers: its last match, which is the line-up
 * closest to the present.
 * @param candidate - The day being copied from
 * @returns The match and the label naming it
 */
function toSource(candidate: CopyCandidate): CopySource {
  const match = candidate.matches[candidate.matches.length - 1];
  const label =
    candidate.matches.length > 1
      ? `${candidate.label} · trận ${candidate.matches.length}`
      : candidate.label;

  return { sessionId: candidate.sessionId, label, match };
}

/**
 * Find the line-up a battle would be copied from: the nearest earlier day of its
 * own week that holds one, falling back to the last such day of the previous
 * week — which is how the first battle of a new week reaches back to the Guild
 * War that closed the old one.
 * @param weekCandidates - Days of the week on screen, ordered by battle time
 * @param targetSessionId - Battle the copy would land on
 * @param previousWeekCandidates - Days of the week before it, ordered by battle time
 * @returns The source, or null when neither week holds a line-up
 */
export function findCopySource(
  weekCandidates: CopyCandidate[],
  targetSessionId: string,
  previousWeekCandidates: CopyCandidate[]
): CopySource | null {
  const targetIndex = weekCandidates.findIndex(
    (candidate) => candidate.sessionId === targetSessionId
  );
  if (targetIndex < 0) return null;

  const inWeek = weekCandidates.slice(0, targetIndex).reverse().find(hasLineUp);
  if (inWeek) return toSource(inWeek);

  // Only ONE week back: a line-up two weeks old is stale enough that copying it
  // does more harm than good.
  const lastWeek = [...previousWeekCandidates].reverse().find(hasLineUp);

  return lastWeek ? toSource(lastWeek) : null;
}
