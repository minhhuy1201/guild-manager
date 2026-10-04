import { leaveSchema, type Leave } from '@guild/shared/schemas';

import { verifyResponse } from '../../config';
import type { LeaveWindow } from './leave-coverage';

/** The Leave columns the codec needs. */
export type LeaveRow = {
  id: string;
  characterId: string;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  createdAt: Date;
  createdByCharacterId: string | null;
  createdByAdmin: boolean;
  cancelledAt: Date | null;
  cancelledByAdmin: boolean;
};

/**
 * `@db.Date` columns come back as 00:00 UTC of the stored day, so the UTC slice is the calendar day.
 * @param date - A Date read from a `@db.Date` column
 * @returns `YYYY-MM-DD`
 */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The inverse of `toDateKey`, for writing a `@db.Date` column.
 * @param key - Validated `YYYY-MM-DD`
 * @returns 00:00 UTC of that day
 */
export function fromDateKey(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

/**
 * Turn a Leave row into the object returned to the client.
 * @param row - Row read from Prisma
 * @returns The contract-shaped leave
 */
export function toLeave(row: LeaveRow): Leave {
  return verifyResponse(leaveSchema, {
    id: row.id,
    characterId: row.characterId,
    startDate: toDateKey(row.startDate),
    endDate: toDateKey(row.endDate),
    reason: row.reason,
    createdByCharacterId: row.createdByCharacterId,
    createdAt: row.createdAt.toISOString(),
  } satisfies Leave);
}

/**
 * Turn a Leave row into what the coverage rule reads.
 * @param row - Row read from Prisma
 * @returns The leave with string days and instant audit fields
 */
export function toLeaveWindow(row: LeaveRow): LeaveWindow {
  return {
    id: row.id,
    characterId: row.characterId,
    startDate: toDateKey(row.startDate),
    endDate: toDateKey(row.endDate),
    reason: row.reason,
    createdAt: row.createdAt,
    createdByAdmin: row.createdByAdmin,
    cancelledAt: row.cancelledAt,
    cancelledByAdmin: row.cancelledByAdmin,
  };
}
