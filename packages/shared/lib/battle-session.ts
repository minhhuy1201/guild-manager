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

/** Latest hour a deadline may be set to, within the battle day itself. */
const DEADLINE_CAP_HOUR = 10;

/** Hour of the default deadline, on the day before the battle. */
const DEFAULT_DEADLINE_HOUR = 12;

/** Fixed cut-off hour of a Guild War session. */
const GUILD_WAR_DEADLINE_HOUR = 12;

/** Day offset of Friday from the Monday starting the week. */
const FRIDAY_OFFSET_FROM_MONDAY = 4;

/**
 * Latest allowed deadline for a scrim: 10:00 Vietnam time on the battle day, and
 * never later than the battle itself (for a session before 10:00 the battle time
 * is the cap).
 *
 * This is the cap the backend enforces. The form prefills `defaultDeadlineFor`
 * instead, which is always earlier.
 * @param dateTime - When the battle takes place
 * @returns The latest allowed deadline
 */
export function deadlineCapFor(dateTime: Date): Date {
  const morning = atVnTime(dateTime, DEADLINE_CAP_HOUR, 0);

  return morning.getTime() < dateTime.getTime() ? morning : dateTime;
}

/**
 * Deadline the form prefills for a scrim: 12:00 Vietnam time on the day before
 * the battle.
 *
 * Always within the cap: noon the day before is earlier than midnight of the
 * battle day, so it is earlier than both 10:00 on that day and the battle itself.
 * @param dateTime - When the battle takes place
 * @returns The suggested deadline
 */
export function defaultDeadlineFor(dateTime: Date): Date {
  return shiftVnDate(dateTime, -1, DEFAULT_DEADLINE_HOUR, 0);
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
 * Fixed deadline of a week's Guild War: 12:00 Friday of that week. Owned by the
 * system, not editable by admins.
 * @param weekStart - Monday 00:00 Vietnam time of the week containing the battle
 * @returns Friday 12:00 of the same week
 */
export function guildWarDeadline(weekStart: Date): Date {
  return shiftVnDate(
    weekStart,
    FRIDAY_OFFSET_FROM_MONDAY,
    GUILD_WAR_DEADLINE_HOUR,
    0
  );
}
