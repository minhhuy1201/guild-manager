import { closingMoment } from '../battle-sessions/battle-sessions.public';
import type { CoverageSession } from './leave-coverage';

/** One stretch of Auto-attend, with its moments as instants. */
export interface AutoAttendWindow {
  id: string;
  characterId: string;
  enabledAt: Date;
  disabledAt: Date | null;
}

/**
 * Whether an Auto-attend period turns this day into a "Có" for its character.
 *
 * No admin exception and no date range: only the member turns it on, and it covers every day until
 * they turn it off.
 * @param period - The period, ended or not
 * @param session - The battle day
 * @returns True when the period covers the day
 */
export function isAutoAttendCovering(
  period: AutoAttendWindow,
  session: CoverageSession,
): boolean {
  const closeAt = closingMoment(
    session.deadline,
    session.attendanceClosedAt,
  ).getTime();

  // Strict `<`: turned on at the very moment the day closes has not beaten the closing.
  if (period.enabledAt.getTime() >= closeAt) return false;
  if (period.disabledAt === null) return true;

  // Turned off after the day closed: that day keeps its "Có".
  return period.disabledAt.getTime() >= closeAt;
}
