import type { AttendanceRecord, BattleSession } from "@guild/shared/schemas";

import { recordKey } from "./record-key";

/** How one battle day's answers split, in the chart's own vocabulary (`attendance-summary`). */
export interface DayTotals {
  /** Answered "Có" */
  co: number;
  /** Answered "Không" */
  khong: number;
  /** No answer yet */
  chuaTraLoi: number;
}

/**
 * Count each battle day's answers over a set of members, for the grid's totals row.
 * Only the given members are counted: a record left behind by someone who has since left the
 * guild is not part of today's answer to "how many are coming".
 * @param characterIds - Members to count, usually the whole roster
 * @param sessions - Battle days of the week
 * @param records - Recorded answers, keyed by `recordKey`
 * @returns The totals of every day, keyed by session id
 */
export function countDayTotals(
  characterIds: string[],
  sessions: Pick<BattleSession, "id">[],
  records: Record<string, Pick<AttendanceRecord, "isPresent">>
): Record<string, DayTotals> {
  return Object.fromEntries(
    sessions.map((session) => {
      const totals: DayTotals = { co: 0, khong: 0, chuaTraLoi: 0 };

      for (const characterId of characterIds) {
        const answer = records[recordKey(characterId, session.id)]?.isPresent;
        if (answer === undefined) totals.chuaTraLoi += 1;
        else if (answer) totals.co += 1;
        else totals.khong += 1;
      }

      return [session.id, totals];
    })
  );
}
