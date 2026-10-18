/** Number of teams in the war formation. */
export const TEAM_COUNT = 10;

/** Number of slots inside a single team. */
export const SLOTS_PER_TEAM = 6;

/** Where a slot sits in the grid. */
export interface SlotCoordinates {
  /** Team number, 1..TEAM_COUNT */
  team: number;
  /** Row inside the team, 1..SLOTS_PER_TEAM */
  position: number;
}

/** No leading zero, so every id has exactly one spelling and `buildSlotId` round-trips. */
const SLOT_ID_PATTERN = /^team-([1-9]\d*)-pos-([1-9]\d*)$/;

/**
 * Build the stable id of a slot from its coordinates.
 * @param team - Team number, 1..TEAM_COUNT
 * @param position - Row inside the team, 1..SLOTS_PER_TEAM
 * @returns Slot id, e.g. "team-3-pos-2"
 */
export function buildSlotId(team: number, position: number): string {
  return `team-${team}-pos-${position}`;
}

/**
 * Read the coordinates back out of a slot id.
 *
 * Returns null instead of throwing: slot ids are stored as free strings, and a row written before a
 * grid resize (or by hand) must be skippable by the caller rather than fatal.
 *
 * @param slotId - Slot id, e.g. "team-3-pos-2"
 * @returns The coordinates, or null when the id is malformed or outside the grid
 */
export function parseSlotId(slotId: string): SlotCoordinates | null {
  const match = SLOT_ID_PATTERN.exec(slotId);

  if (!match) return null;

  const team = Number(match[1]);
  const position = Number(match[2]);

  if (team > TEAM_COUNT || position > SLOTS_PER_TEAM) return null;

  return { team, position };
}
