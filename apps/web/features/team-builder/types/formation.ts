import type { GuildClass } from "@shared/enums";

/**
 * One cell of the war formation. Position is fixed layout data — users never edit it.
 */
export interface Slot {
  /** Slot id, shaped like "team-3-pos-2" */
  id: string;
  /** Team number, 1..10 */
  team: number;
  /** Row inside the team, 1..6 (each team is a single column of six rows) */
  position: number;
  /**
   * Guild class suggested for this position. Purely a hint shown as the empty
   * slot's placeholder — every slot accepts every class.
   */
  suggestedClass?: GuildClass;
}

/**
 * Formation layout — static data. Kept flat on purpose: grouping by team happens
 * at render time, so changing team count only touches the mock builder.
 */
export interface Formation {
  /** Formation id */
  id: string;
  /** Display name shown to the user */
  name: string;
  /** Every slot of every team, flat */
  slots: Slot[];
}

/** Who stands in which slot. The only thing the user actually edits. */
export type Assignment = Record<string, string | null>;

/** Where a drag started from. */
export type DragSource = { kind: "pool" } | { kind: "slot"; slotId: string };

/** Where a drag was released. `null` means outside every droppable area. */
export type DropTarget = { kind: "slot"; slotId: string } | { kind: "pool" } | null;
