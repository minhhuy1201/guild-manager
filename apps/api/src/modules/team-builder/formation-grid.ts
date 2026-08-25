import type { MatchFormation } from '@guild/shared/schemas';

/**
 * Codec between a match's formation (`MatchFormation`) and the `FormationSlot` rows in the database.
 *
 * The rule for both directions, stated once here: **a row exists when the slot HAS AN OCCUPANT or HAS
 * A NOTE.** A slot that is both empty and note-less has no row, so encoding must take the union of
 * both key sets (walking `slots` alone drops note-only slots) and decoding must filter each column
 * separately (`characterId` and `note` can both be null).
 *
 * `prisma/schema.prisma` states the same rule on the data side; this file is the only place it
 * becomes code.
 */

/** One `FormationSlot` row — produced when writing, consumed when reading. */
export interface SlotRow {
  slotId: string;
  characterId: string | null;
  note: string | null;
}

/** A row known to have an occupant, used to narrow the type instead of `as string`. */
type OccupiedRow = SlotRow & { characterId: string };

/** A row known to have a note. */
type AnnotatedRow = SlotRow & { note: string };

/**
 * Turn a match's formation into `FormationSlot` rows.
 * @param match - The match's formation and notes, characterIds already filtered
 * @returns Rows for Prisma's nested create; order is meaningless
 */
export function encodeMatch(match: MatchFormation): SlotRow[] {
  const slotIds = new Set([
    ...Object.keys(match.slots),
    ...Object.keys(match.notes),
  ]);

  return [...slotIds].map((slotId) => ({
    slotId,
    characterId: match.slots[slotId] ?? null,
    note: match.notes[slotId] ?? null,
  }));
}

/**
 * Rebuild a match's formation from its `FormationSlot` rows.
 * The inverse of `encodeMatch`: `decodeMatch(encodeMatch(x))` deep-equals `x`.
 * @param rows - Rows of one match, in any order
 * @returns The match's formation; no rows yields `{ slots: {}, notes: {} }`
 */
export function decodeMatch(rows: SlotRow[]): MatchFormation {
  return {
    slots: Object.fromEntries(
      rows
        .filter(isOccupied)
        .map((row) => [row.slotId, row.characterId] as const),
    ),
    notes: Object.fromEntries(
      rows.filter(isAnnotated).map((row) => [row.slotId, row.note] as const),
    ),
  };
}

/**
 * Whether this row has someone placed.
 * @param row - Row to test
 * @returns true when `characterId` is not null, narrowing the row's type
 */
function isOccupied(row: SlotRow): row is OccupiedRow {
  return row.characterId !== null;
}

/**
 * Whether this row has a note.
 * @param row - Row to test
 * @returns true when `note` is not null, narrowing the row's type
 */
function isAnnotated(row: SlotRow): row is AnnotatedRow {
  return row.note !== null;
}
