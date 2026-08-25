import type { AttendanceStatus } from '@guild/shared/enums';
import {
  attendanceRecordSchema,
  type AttendanceRecord,
} from '@guild/shared/schemas';

import { verifyResponse } from '../../config';

/** The AttendanceRecord columns the codec needs to build a response. */
export type AttendanceRecordRow = {
  characterId: string;
  sessionId: string;
  status: string;
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
    // Prisma emits a string literal union, the shared enum is a TS enum — same values, constrained
    // by the database enum, so the cast is safe. `verifyResponse` is what asserts that outside
    // production: a cast is not checked by the compiler.
    status: row.status as AttendanceStatus,
    markedAt: row.markedAt.toISOString(),
  } satisfies AttendanceRecord);
}
