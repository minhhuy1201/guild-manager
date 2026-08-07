import type { Assignment, Slot } from "../types/formation";
import type { WireAssignment } from "../types/session-formation";

/**
 * Strip empty slots before sending an assignment to the server.
 * The wire format omits empty slots entirely, so a payload never carries
 * sixty null entries.
 * @param assignment - Assignment as the UI holds it, empty slots being null
 * @returns Assignment with only the filled slots
 */
export function toWire(assignment: Assignment): WireAssignment {
  const filled = Object.entries(assignment).filter(
    (entry): entry is [string, string] => entry[1] !== null
  );

  return Object.fromEntries(filled);
}

/**
 * Rebuild the UI-side assignment from what the server stored. Every slot of the
 * current layout gets a key; anything the server does not mention is empty.
 * Keys that match no current slot are dropped, so an old saved formation
 * survives a layout change instead of poisoning the grid.
 * @param wire - Assignment as stored, only filled slots present
 * @param slots - Slots of the current layout
 * @returns Assignment with one key per slot
 */
export function fromWire(wire: WireAssignment, slots: Slot[]): Assignment {
  const assignment: Assignment = {};

  for (const slot of slots) {
    assignment[slot.id] = wire[slot.id] ?? null;
  }

  return assignment;
}

/**
 * Strip empty slots from every match of a day before sending it.
 * @param matches - Line-up of each match, as the UI holds it
 * @returns Same order, each match carrying only its filled slots
 */
export function toWireMatches(matches: Assignment[]): WireAssignment[] {
  return matches.map(toWire);
}

/**
 * Rebuild a day's line-ups from what the server stored.
 * A day with nothing saved comes back as `[]`; it is normalised to one empty
 * match here so nothing downstream has to handle "no match at all".
 * @param wire - Matches as stored, only filled slots present
 * @param slots - Slots of the current layout
 * @returns One assignment per match, always at least one
 */
export function fromWireMatches(
  wire: WireAssignment[],
  slots: Slot[]
): Assignment[] {
  const source = wire.length > 0 ? wire : [{}];

  return source.map((match) => fromWire(match, slots));
}
