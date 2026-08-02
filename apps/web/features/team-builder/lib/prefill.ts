import type { Assignment, Slot } from "../types/formation";
import type { SessionFormation } from "../types/session-formation";
import { fromWire } from "./wire";

/** A formation proposed for a battle that has none yet. */
export interface PrefillResult {
  /** The proposed assignment, already stripped of absentees */
  assignment: Assignment;
  /** Label of the battle it was copied from */
  sourceLabel: string;
  /** How many people were dropped for not attending this battle */
  droppedCount: number;
}

/**
 * Propose a formation for a battle by copying the most recent earlier battle of
 * the same week that has one, keeping only people attending this battle.
 * @param sessions - Every battle of the week, ordered by battle time
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

  const source = sessions
    .slice(0, targetIndex)
    .reverse()
    .find((session) => Object.keys(session.assignment).length > 0);
  if (!source) return null;

  const previous = fromWire(source.assignment, slots);
  const assignment: Assignment = {};
  let droppedCount = 0;

  for (const slot of slots) {
    const characterId = previous[slot.id];

    if (characterId === null || characterId === undefined) {
      assignment[slot.id] = null;
      continue;
    }

    if (presentIds.has(characterId)) {
      assignment[slot.id] = characterId;
    } else {
      assignment[slot.id] = null;
      droppedCount += 1;
    }
  }

  return { assignment, sourceLabel: source.label, droppedCount };
}
