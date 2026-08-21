import type { MatchFormation } from "@guild/shared/schemas";

import type { Assignment, MatchDraft, Notes, Slot } from "../types/formation";

/**
 * Strip empty slots before sending an assignment to the server.
 * The wire format omits empty slots entirely, so a payload never carries
 * sixty null entries.
 * @param assignment - Assignment as the UI holds it, empty slots being null
 * @returns Assignment with only the filled slots
 */
function toWire(assignment: Assignment): MatchFormation["slots"] {
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
export function fromWire(
  wire: MatchFormation["slots"],
  slots: Slot[]
): Assignment {
  const assignment: Assignment = {};

  for (const slot of slots) {
    assignment[slot.id] = wire[slot.id] ?? null;
  }

  return assignment;
}

/**
 * Strip blank notes before sending, and trim the ones that stay.
 * A slot the user typed into and then emptied must lose its key, or the server
 * would reject the payload — the schema has no room for an empty note.
 * @param notes - Notes as the UI holds them, possibly with blank entries
 * @returns Notes with only the non-blank ones, each trimmed
 */
function toWireNotes(notes: Notes): MatchFormation["notes"] {
  const filled = Object.entries(notes)
    .map(([slotId, text]): [string, string] => [slotId, text.trim()])
    .filter(([, text]) => text !== "");

  return Object.fromEntries(filled);
}

/**
 * Rebuild the notes of one match from what the server stored.
 * Keys matching no current slot are dropped, so an old saved note survives a
 * layout change instead of hanging off a slot that no longer exists.
 * @param wire - Notes as stored, blank ones absent
 * @param slots - Slots of the current layout
 * @returns Notes keyed by slot id, absent where there is nothing written
 */
export function fromWireNotes(
  wire: MatchFormation["notes"],
  slots: Slot[]
): Notes {
  const notes: Notes = {};

  for (const slot of slots) {
    const text = wire[slot.id];
    if (text) notes[slot.id] = text;
  }

  return notes;
}

/**
 * Strip empty slots and blank notes from every match of a day before sending.
 * @param matches - Each match of the day, as the UI holds it
 * @returns Same order, each match carrying only its filled slots and notes
 */
export function toWireMatches(matches: MatchDraft[]): MatchFormation[] {
  return matches.map((match) => ({
    slots: toWire(match.assignment),
    notes: toWireNotes(match.notes),
  }));
}

/**
 * Rebuild a day's matches from what the server stored.
 * A day with nothing saved comes back as `[]`; it is normalised to one empty
 * match here so nothing downstream has to handle "no match at all".
 * @param wire - Matches as stored
 * @param slots - Slots of the current layout
 * @returns One draft per match, always at least one
 */
export function fromWireMatches(
  wire: MatchFormation[],
  slots: Slot[]
): MatchDraft[] {
  const source = wire.length > 0 ? wire : [{ slots: {}, notes: {} }];

  return source.map((match) => ({
    assignment: fromWire(match.slots, slots),
    notes: fromWireNotes(match.notes, slots),
  }));
}
