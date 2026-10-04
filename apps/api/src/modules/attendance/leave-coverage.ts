import { vnDateKey } from '@guild/shared/lib';
import type { AttendanceRecord } from '@guild/shared/schemas';

/** What the coverage rule needs to know about a battle day. */
export interface CoverageSession {
  id: string;
  dateTime: Date;
  deadline: Date;
  attendanceClosedAt: Date | null;
}

/** A leave with its dates as Vietnam `YYYY-MM-DD` strings and its audit moments as instants. */
export interface LeaveWindow {
  id: string;
  characterId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  createdAt: Date;
  createdByAdmin: boolean;
  cancelledAt: Date | null;
  cancelledByAdmin: boolean;
}

/**
 * The moment a day stops accepting member answers.
 * @param session - The battle day
 * @returns When the announcement closed it, else its deadline
 */
export function closingMoment(session: CoverageSession): Date {
  // An announcement closes the day before its deadline does - the same two ways in as isAttendanceClosed.
  return session.attendanceClosedAt ?? session.deadline;
}

/**
 * Whether a leave turns this day into a "Không" for its character.
 * @param leave - The leave, cancelled or not
 * @param session - The battle day
 * @returns True when the leave covers the day
 */
export function isLeaveCovering(
  leave: LeaveWindow,
  session: CoverageSession,
): boolean {
  const day = vnDateKey(session.dateTime);
  if (day < leave.startDate || day > leave.endDate) return false;

  const closeAt = closingMoment(session).getTime();
  // An admin may act on a closed day, exactly as when marking attendance; a member may not.
  const isCreatedInTime =
    leave.createdByAdmin || leave.createdAt.getTime() < closeAt;
  if (!isCreatedInTime) return false;

  if (leave.cancelledAt === null) return true;

  return !leave.cancelledByAdmin && leave.cancelledAt.getTime() >= closeAt;
}

/**
 * Pressed answers plus the "Không" entries leaves imply for cells nobody answered.
 * @param records - Stored answers
 * @param leaves - Leaves of the characters involved
 * @param sessions - The battle days being read
 * @returns Entries newest first, an answer always winning over a leave
 */
export function effectiveRecords(
  records: AttendanceRecord[],
  leaves: LeaveWindow[],
  sessions: CoverageSession[],
): AttendanceRecord[] {
  const answered = new Set(
    records.map((r) => `${r.sessionId}:${r.characterId}`),
  );
  const implied: AttendanceRecord[] = [];

  for (const session of sessions) {
    for (const leave of leaves) {
      const key = `${session.id}:${leave.characterId}`;
      if (answered.has(key) || !isLeaveCovering(leave, session)) continue;

      answered.add(key);
      implied.push({
        characterId: leave.characterId,
        sessionId: session.id,
        isPresent: false,
        markedAt: leave.createdAt.toISOString(),
        reason: leave.reason,
        source: 'leave',
      });
    }
  }

  return [...records, ...implied].sort((a, b) =>
    b.markedAt.localeCompare(a.markedAt),
  );
}
