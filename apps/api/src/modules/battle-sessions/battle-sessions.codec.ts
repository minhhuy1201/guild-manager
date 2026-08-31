import { battleSessionSchema, type BattleSession } from '@guild/shared/schemas';

import { verifyResponse } from '../../config';
import { formatSessionLabel, isDeadlinePassed } from './session-schedule';

/** A BattleSession row read with the extra counts the entity needs. */
export type SessionRow = {
  id: string;
  dateTime: Date;
  deadline: Date;
  opponent: string | null;
  isGuildWar: boolean;
  matchCount: number;
  weekStart: Date;
  _count: { attendanceRecords: number; formationMatches: number };
};

/**
 * Turn a BattleSession row into the object returned to the client.
 * @param row - Row read from Prisma, with `_count`
 * @param now - Moment the response is built, used to fix the past-deadline flag
 * @returns The session with its label built and times as ISO strings
 */
export function toBattleSession(row: SessionRow, now: Date): BattleSession {
  return verifyResponse(battleSessionSchema, {
    id: row.id,
    label: formatSessionLabel(row.dateTime, row.isGuildWar),
    dateTime: row.dateTime.toISOString(),
    deadline: row.deadline.toISOString(),
    isDeadlinePassed: isDeadlinePassed(row.deadline, now),
    isGuildWar: row.isGuildWar,
    opponent: row.opponent,
    weekStart: row.weekStart.toISOString(),
    attendanceCount: row._count.attendanceRecords,
    matchCount: row.matchCount,
    formationMatchCount: row._count.formationMatches,
  } satisfies BattleSession);
}
