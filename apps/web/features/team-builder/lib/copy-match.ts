import type { Assignment, MatchDraft, Notes, Slot } from "../types/formation";

/** One match copied onto another battle, absentees already dropped. */
export interface CopiedMatch {
  /** Who stands where, one key per slot of the current layout */
  assignment: Assignment;
  /** Notes copied across untouched, keyed by slot id */
  notes: Notes;
  /** How many people were dropped for not attending the target battle */
  droppedCount: number;
}

/**
 * Copy one match onto a battle, keeping only the people attending it.
 * Notes travel across untouched, the note of a dropped occupant included: a
 * note describes the position, not the person.
 * @param match - The match being copied from
 * @param presentIds - Ids of characters attending the target battle
 * @param slots - Slots of the current layout
 * @returns The copied line-up and how many people it dropped
 */
export function copyMatch(
  match: MatchDraft,
  presentIds: Set<string>,
  slots: Slot[]
): CopiedMatch {
  const assignment: Assignment = {};
  let droppedCount = 0;

  for (const slot of slots) {
    const characterId = match.assignment[slot.id] ?? null;

    if (characterId === null) {
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

  return { assignment, notes: { ...match.notes }, droppedCount };
}
