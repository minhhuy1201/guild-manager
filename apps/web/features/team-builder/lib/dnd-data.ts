import type { DragSource, DropTarget } from "../types/formation";

/**
 * Droppable id of the member pool. Slot ids are shaped "team-N-pos-M",
 * so this value can never collide with one.
 */
export const POOL_DROPPABLE_ID = "pool";

/** Payload attached to a draggable member card. */
export interface MemberDragData {
  type: "member";
  /** Character being dragged */
  characterId: string;
  /** Slot id the character currently sits in, or POOL_DROPPABLE_ID */
  from: string;
}

/** Payload attached to a droppable slot. */
export interface SlotDropData {
  type: "slot";
  /** Slot receiving the drop */
  slotId: string;
}

/** Payload attached to the droppable pool area. */
export interface PoolDropData {
  type: "pool";
}

/**
 * Narrow the untyped `active.data.current` of dnd-kit to a member payload.
 * @param value - Raw drag data from dnd-kit
 * @returns true when the value is a well-formed member payload
 */
export function isMemberDragData(value: unknown): value is MemberDragData {
  if (typeof value !== "object" || value === null) return false;

  const data = value as Record<string, unknown>;
  return (
    data.type === "member" &&
    typeof data.characterId === "string" &&
    typeof data.from === "string"
  );
}

/**
 * Translate a member payload into the drag source the reducer expects.
 * @param data - Member payload read from the drag event
 * @returns Pool source, or slot source carrying the origin slot id
 */
export function toDragSource(data: MemberDragData): DragSource {
  return data.from === POOL_DROPPABLE_ID
    ? { kind: "pool" }
    : { kind: "slot", slotId: data.from };
}

/**
 * Narrow the untyped `over?.data.current` of dnd-kit into a drop target.
 * @param value - Raw drop data from dnd-kit, undefined when released outside
 * @returns The drop target, or null for an out-of-bounds or malformed drop
 */
export function toDropTarget(value: unknown): DropTarget {
  if (typeof value !== "object" || value === null) return null;

  const data = value as Record<string, unknown>;

  if (data.type === "pool") return { kind: "pool" };
  if (data.type === "slot" && typeof data.slotId === "string") {
    return { kind: "slot", slotId: data.slotId };
  }

  return null;
}
