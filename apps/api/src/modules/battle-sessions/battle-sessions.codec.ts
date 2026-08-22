import { battleSessionSchema, type BattleSession } from '@guild/shared/schemas';

import { verifyResponse } from '../../config';
import { formatSessionLabel, isDeadlinePassed } from './session-schedule';

/** Hàng BattleSession đọc kèm số liệu phụ cho entity. */
export type SessionRow = {
  id: string;
  dateTime: Date;
  deadline: Date;
  opponent: string | null;
  isGuildWar: boolean;
  weekStart: Date;
  _count: { attendanceRecords: number; formationMatches: number };
};

/**
 * Đổi một hàng BattleSession thành object trả về cho client.
 * @param row - Hàng đọc từ Prisma kèm `_count`
 * @param now - Thời điểm dựng response, dùng để chốt cờ quá hạn
 * @returns Trận đánh đã dựng nhãn và đổi thời gian sang ISO string
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
    hasFormation: row._count.formationMatches > 0,
  } satisfies BattleSession);
}
