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
 * Find the line-up a battle would be copied from: the day immediately before it,
 * and for the first battle of a week the last day of the previous one — which is
 * how a new week picks up from the Guild War that closed the old one.
 *
 * Only that one day is considered. A day whose predecessor is still empty has
 * nothing to copy, and skipping past it to an older line-up would put the button
 * on a day the user never named.
 * @param weekCandidates - Days of the week on screen, ordered by battle time
 * @param targetSessionId - Battle the copy would land on
 * @param previousWeekCandidates - Days of the week before it, ordered by battle time
 * @returns The source, or null when that day holds nothing
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

  const candidate =
    targetIndex > 0
      ? weekCandidates[targetIndex - 1]
      : previousWeekCandidates[previousWeekCandidates.length - 1];

  if (!candidate || !hasLineUp(candidate)) return null;

  return toSource(candidate);
}
