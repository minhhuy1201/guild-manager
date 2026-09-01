import type { SessionFormation } from "@guild/shared/schemas";

import type { Assignment, MatchDraft, Notes, Slot } from "../types/formation";
import { copyMatch } from "./copy-match";
import { lastLineUp } from "./day-matches";
import { fromWireMatches } from "./wire";

/** A formation proposed for a battle that has none yet. */
export interface PrefillResult {
  /** The proposed assignment, already stripped of absentees */
  assignment: Assignment;
  /** Notes copied along with the line-up, keyed by slot id */
  notes: Notes;
  /** Label of the battle it was copied from */
  sourceLabel: string;
  /** How many people were dropped for not attending this battle */
  droppedCount: number;
}

/**
 * Propose a formation for a battle by copying the most recent earlier battle of
 * the same week that has one, keeping only people attending this battle.
 * @param sessions - Every battle day of the week, ordered by battle time
 * @param targetSessionId - Battle needing a formation
 * @param presentIds - Ids of characters attending the target battle
 * @param slots - Slots of the current layout
 * @returns The proposal, or null when there is nothing to copy from
 */
export function buildPrefill(
  sessions: SessionFormation[],
  targetSessionId: string,
  presentIds: Set<string>,
  slots: Slot[]
): PrefillResult | null {
  const targetIndex = sessions.findIndex(
    (session) => session.sessionId === targetSessionId
  );
  if (targetIndex < 0) return null;

  // Sources are judged by the line-up that would actually be copied — the day's
  // last match — so a day holding only notes, or one whose match 2 was emptied,
  // is not a source. `fromWireMatches` is what normalises a stored empty match 2
  // away, which is why this reads the rebuilt matches rather than the wire.
  for (const session of sessions.slice(0, targetIndex).reverse()) {
    const matches = fromWireMatches(session.matches, slots);
    const previous = lastLineUp(matches);
    if (!previous) continue;

    const sourceLabel =
      matches.length > 1
        ? `${session.label} · trận ${matches.length}`
        : session.label;
    const copied = copyMatch(previous, presentIds, slots);

    return {
      assignment: copied.assignment,
      notes: copied.notes,
      sourceLabel,
      droppedCount: copied.droppedCount,
    };
  }

  return null;
}

/**
 * Whether a day still shows the proposal untouched. The banner is written in
 * the past tense — "đã điền sẵn từ X" — so it belongs on screen exactly as long
 * as the draft is the one that was filled in, and goes the moment the user
 * clears it, edits it, or adds a second match. Comparing content rather than
 * counting placements matters: a proposal that dropped everyone for not
 * attending is empty and is precisely the one worth announcing.
 * @param draft - The open day's draft, undefined when it has none
 * @param proposal - What this day would be filled from, null when nothing would
 * @returns true while the draft matches the proposal slot for slot
 */
export function isPrefillShowing(
  draft: MatchDraft[] | undefined,
  proposal: PrefillResult | null
): boolean {
  if (!proposal || !draft || draft.length !== 1) return false;

  const placed = draft[0].assignment;

  return Object.entries(proposal.assignment).every(
    ([slotId, characterId]) => (placed[slotId] ?? null) === characterId
  );
}
