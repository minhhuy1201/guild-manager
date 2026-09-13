import { recordKey } from "./record-key";

/** One answer the admin changed on the grid and has not saved yet. */
export interface CellChange {
  /** Character of the cell */
  characterId: string;
  /** Battle of the cell */
  sessionId: string;
  /** The answer the cell will be saved as */
  isPresent: boolean;
}

/** The grid's unsaved answers, keyed by `recordKey`. A cell with no key shows the server's value. */
export type GridDraft = Record<string, CellChange>;

/**
 * The answer a press moves a cell to: an unanswered cell becomes "Có", then the two answers
 * alternate. It never goes back to "unanswered" - the API has one write per cell and no delete, so
 * that state cannot be saved (decided with the guild owner).
 * @param current - The answer the cell shows now, undefined when there is none
 * @returns The answer after one press
 */
function nextAnswer(current: boolean | undefined): boolean {
  return current === undefined ? true : !current;
}

/**
 * Press one cell of the grid.
 *
 * A cell pressed back to what the server already holds leaves the draft rather than staying as a
 * "change" to the same value: the count on the save bar must only ever count real edits.
 * @param draft - The grid's unsaved answers
 * @param cell - Which character and battle was pressed
 * @param saved - What the server holds for the cell, undefined when unanswered
 * @returns A new draft; `draft` is left untouched
 */
export function clickCell(
  draft: GridDraft,
  cell: { characterId: string; sessionId: string },
  saved: boolean | undefined
): GridDraft {
  const key = recordKey(cell.characterId, cell.sessionId);
  const next = nextAnswer(draft[key]?.isPresent ?? saved);
  const rest = Object.fromEntries(
    Object.entries(draft).filter(([entryKey]) => entryKey !== key)
  );

  return next === saved ? rest : { ...rest, [key]: { ...cell, isPresent: next } };
}
