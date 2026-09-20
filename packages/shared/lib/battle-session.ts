/**
 * Attendance deadline rules for a battle session.
 *
 * The deadline cap is a HARD constraint, not a hint: the backend rejects a
 * violating request instead of clamping it, so the form and the backend must
 * share the calculation here.
 *
 * Every clock value is Vietnam time (fixed UTC+7), independent of the host
 * machine's timezone.
 */
import { atVnTime, shiftVnDate } from './vn-time';

/**
 * Hour the attendance form closes, on the battle day itself.
 * Exported so the settings form prefills the same hour the backend enforces, instead of repeating
 * the literal "11:00".
 */
export const DEADLINE_HOUR = 11;

/**
 * Day offset of Saturday from the Monday starting the week.
 * Exported because both the backend's week rules and the History week picker measure the same
 * Monday-to-Saturday span, and a second copy of the number is how the two drift apart.
 */
export const SATURDAY_OFFSET_FROM_MONDAY = 5;

/**
 * Latest allowed deadline for a scrim: 11:00 Vietnam time on the battle day, and
 * never later than the battle itself (for a session before 11:00 the battle time
 * is the cap).
 *
 * This is both the cap the backend enforces and the value the form prefills —
 * one rule, so a prefilled deadline can never be rejected.
 * @param dateTime - When the battle takes place
 * @returns The latest allowed deadline
 */
export function deadlineCapFor(dateTime: Date): Date {
  const morning = atVnTime(dateTime, DEADLINE_HOUR, 0);

  return morning.getTime() < dateTime.getTime() ? morning : dateTime;
}

/**
 * Whether a deadline is within the cap — the single rule shared by the schema,
 * the service and the form.
 * @param deadline - Deadline under test
 * @param dateTime - Battle time of the session
 * @returns true when valid (equal to the cap still counts)
 */
export function isWithinDeadlineCap(deadline: Date, dateTime: Date): boolean {
  return deadline.getTime() <= deadlineCapFor(dateTime).getTime();
}

/**
 * Fixed deadline of a week's Guild War: 11:00 Saturday, the morning of the
 * battle. Owned by the system, not editable by admins.
 * @param weekStart - Monday 00:00 Vietnam time of the week containing the battle
 * @returns Saturday 11:00 of the same week
 */
export function guildWarDeadline(weekStart: Date): Date {
  return shiftVnDate(weekStart, SATURDAY_OFFSET_FROM_MONDAY, DEADLINE_HOUR, 0);
}
