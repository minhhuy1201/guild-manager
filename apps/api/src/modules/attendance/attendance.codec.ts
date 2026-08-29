import {
  attendanceRecordSchema,
  type AttendanceRecord,
} from '@guild/shared/schemas';

import { verifyResponse } from '../../config';

/** The AttendanceRecord columns the codec needs to build a response. */
export type AttendanceRecordRow = {
  characterId: string;
  sessionId: string;
  isPresent: boolean;
  markedAt: Date;
};

/**
 * Turn an AttendanceRecord row into the object returned to the client.
 * @param row - Row read from Prisma
 * @returns The contract-shaped entry, timestamps as ISO strings
 */
export function toAttendanceRecord(row: AttendanceRecordRow): AttendanceRecord {
  return verifyResponse(attendanceRecordSchema, {
    characterId: row.characterId,
    sessionId: row.sessionId,
    isPresent: row.isPresent,
    markedAt: row.markedAt.toISOString(),
  } satisfies AttendanceRecord);
}
