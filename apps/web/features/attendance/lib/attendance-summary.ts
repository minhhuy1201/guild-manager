import { GUILD_CLASS_OPTIONS, type GuildClass } from "@guild/shared/enums";
import type { AttendanceRecord, Character } from "@guild/shared/schemas";

import { recordKey } from "./record-key";

/** One class's answers for one battle session. */
export interface ClassAttendanceSummary {
  guildClass: GuildClass;
  /** Members who answered "Có" */
  co: number;
  /** Members who answered "Không" */
  khong: number;
  /** Members with no record for the session yet */
  chuaTraLoi: number;
  /** Members of the class in scope — the three counts always add up to this */
  total: number;
}

/**
 * Tally one session's answers per guild class.
 * Always returns the seven classes in `GUILD_CLASS_OPTIONS` order, zeroes included, so every card
 * draws the same seven rows in the same order however the roster is filtered.
 * @param characters - Characters in scope (already filtered by the screen)
 * @param records - Every attendance record, keyed by `recordKey`
 * @param sessionId - Session being tallied
 * @returns One row per guild class, in display order
 */
export function summarizeByClass(
  characters: Character[],
  records: Record<string, AttendanceRecord>,
  sessionId: string
): ClassAttendanceSummary[] {
  const rows = new Map<GuildClass, ClassAttendanceSummary>(
    GUILD_CLASS_OPTIONS.map((guildClass) => [
      guildClass,
      { guildClass, co: 0, khong: 0, chuaTraLoi: 0, total: 0 },
    ])
  );

  for (const character of characters) {
    const row = rows.get(character.guildClass);

    // A class the enum does not know cannot reach here: `guildClass` is validated at the boundary.
    if (!row) continue;

    const record = records[recordKey(character.id, sessionId)];
    if (!record) row.chuaTraLoi += 1;
    else if (record.isPresent) row.co += 1;
    else row.khong += 1;

    row.total += 1;
  }

  return [...rows.values()];
}

/**
 * The largest class size across a set of summaries.
 * Every card shares this as its X axis maximum, so a bar's length means the same thing in every
 * card and between two classes — without it recharts scales each chart to its own data and a class
 * of three would look as busy as a class of twelve.
 * @param summaries - Summaries of every session on screen
 * @returns The largest total, or 1 when nothing is in scope (an axis needs a non-zero range)
 */
export function maxClassSize(summaries: ClassAttendanceSummary[][]): number {
  const totals = summaries.flat().map((row) => row.total);

  return Math.max(1, ...totals);
}
