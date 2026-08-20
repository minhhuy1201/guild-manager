import type { Assignment, DragSource, DropTarget } from "../types/formation";

/**
 * Find which slot currently holds a character.
 * @param assignment - Current assignment
 * @param characterId - Character to look for
 * @returns The slot id holding the character, or null when they are in the pool
 */
function findSlotOf(assignment: Assignment, characterId: string): string | null {
  const entry = Object.entries(assignment).find(([, value]) => value === characterId);
  return entry ? entry[0] : null;
}

/**
 * Put a character into a slot, clearing whichever other slot they occupied.
 * Clearing the previous slot is what makes duplicating a character impossible,
 * whichever direction the drag came from.
 * @param assignment - Current assignment
 * @param slotId - Slot receiving the character
 * @param characterId - Character being placed
 * @returns A new assignment
 */
function assign(
  assignment: Assignment,
  slotId: string,
  characterId: string
): Assignment {
  const next = { ...assignment };
  const previousSlotId = findSlotOf(assignment, characterId);

  if (previousSlotId !== null) next[previousSlotId] = null;
  next[slotId] = characterId;

  return next;
}

/**
 * Empty a slot, sending whoever stood there back to the pool.
 * The pool is derived from the assignment, so no second update is needed.
 * @param assignment - Current assignment
 * @param slotId - Slot to clear
 * @returns A new assignment
 */
function unassign(assignment: Assignment, slotId: string): Assignment {
  return { ...assignment, [slotId]: null };
}

/**
 * Exchange the occupants of two slots.
 * @param assignment - Current assignment
 * @param slotIdA - First slot
 * @param slotIdB - Second slot
 * @returns A new assignment
 */
function swap(
  assignment: Assignment,
  slotIdA: string,
  slotIdB: string
): Assignment {
  return {
    ...assignment,
    [slotIdA]: assignment[slotIdB] ?? null,
    [slotIdB]: assignment[slotIdA] ?? null,
  };
}

/**
 * Resolve one drag-and-drop gesture into the next assignment.
 * This is the single place the six drop cases are decided; callers only
 * translate their own events into DragSource / DropTarget.
 *
 * Returns the exact input object (not a copy) for no-op gestures, so a Zustand
 * `set` with the result does not trigger a needless re-render.
 * @param assignment - Current assignment
 * @param source - Where the drag started
 * @param characterId - Character being dragged
 * @param target - Where it was released, or null when outside every droppable
 * @returns The next assignment, or the input unchanged for a no-op
 */
export function applyDrop(
  assignment: Assignment,
  source: DragSource,
  characterId: string,
  target: DropTarget
): Assignment {
  if (target === null) return assignment;

  if (target.kind === "pool") {
    if (source.kind === "pool") return assignment;
    return unassign(assignment, source.slotId);
  }

  if (source.kind === "slot") {
    if (source.slotId === target.slotId) return assignment;
    if (assignment[target.slotId]) return swap(assignment, source.slotId, target.slotId);
  }

  return assign(assignment, target.slotId, characterId);
}
