/**
 * Time rules of the battle schedule — summarised in docs/architecture.md section 6.
 *
 * Every clock value is Vietnam time (fixed UTC+7), independent of the server's clock. The attendance
 * week opens at 22:00 Saturday, for the following week.
 *
 * Since 2026-08 the schedule is entered by admins into the database; this file only keeps the week
 * markers, the fixed Guild War session and the display label format.
 */
import { shiftVnDate, vnParts, vnWeekday } from '@guild/shared/lib';

/** ISO weekday as `vnWeekday()` reports it: 1=Mon, ..., 7=Sun. */
const MONDAY = 1;
const SATURDAY = 6;

/** Hour the new attendance week opens (22:00 Saturday). */
const WEEK_OPEN_HOUR = 22;

/** Day offset of Saturday from the Monday starting the week. */
const SATURDAY_OFFSET_FROM_MONDAY = 5;

/** Fixed battle time of the Guild War. */
const GUILD_WAR_HOUR = 20;
const GUILD_WAR_MINUTE = 0;

/** Milliseconds in a week — the alternation counts whole weeks between two Monday markers. */
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Monday 00:00 Vietnam time of the week the Guild War alternation is anchored to.
 * Written with the `+07:00` offset rather than `Z`: the constant talks about a Monday on the
 * Vietnamese clock, and writing it that way spares every reader the mental subtraction.
 */
const GUILD_WAR_MATCH_COUNT_ANCHOR = new Date('2026-08-31T00:00:00+07:00');

/** Matches played in the anchor week and every second week from it. */
const GUILD_WAR_MATCH_COUNT_EVEN = 2;

/** Matches played in the weeks in between. */
const GUILD_WAR_MATCH_COUNT_ODD = 1;

/** Weekday names indexed straight by `vnWeekday()`; index 0 is empty because ISO counts from 1. */
const WEEKDAY_NAMES = [
  '',
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
  'Chủ nhật',
];

/**
 * Monday 00:00 Vietnam time of an attendance week.
 *
 * The `__weekAnchor` brand exists only at compile time: an arbitrary `Date` is not assignable here,
 * so nobody can pass a session's battle time where a week marker is expected. Only `weekStartOf` and
 * `parseWeekStart` can build one.
 */
export type WeekAnchor = Date & { readonly __weekAnchor: unique symbol };

/** An attendance week: its first and last moment. */
export interface ScheduledWeek {
  /** Monday 00:00 — also the key grouping sessions by week in the database. */
  weekStart: WeekAnchor;
  /** Saturday 23:59 — the closing marker used by the timeline. */
  weekEnd: Date;
}

/**
 * Resolve an instant to Monday 00:00 (Vietnam time) of the week containing it.
 * @param dateTime - Any instant
 * @returns Monday 00:00 of the week containing `dateTime`
 */
export function weekStartOf(dateTime: Date): WeekAnchor {
  return shiftVnDate(
    dateTime,
    -(vnWeekday(dateTime) - MONDAY),
    0,
    0,
  ) as WeekAnchor;
}

/**
 * Whether two week markers denote the same week.
 * Compared by instant, not by string: the same moment written in two timezones must still be `true`.
 * @param a - First week marker
 * @param b - Second week marker
 * @returns true when both point at the same week
 */
export function isSameWeek(a: WeekAnchor, b: WeekAnchor): boolean {
  return a.getTime() === b.getTime();
}

/**
 * Build an attendance week from its Monday marker.
 * @param weekStart - Monday 00:00 Vietnam time
 * @returns The week including its Saturday 23:59 closing marker
 */
function toWeek(weekStart: WeekAnchor): ScheduledWeek {
  return { weekStart, weekEnd: weekEndOf(weekStart) };
}

/**
 * The closing marker of an attendance week (Saturday 23:59 Vietnam time).
 * @param weekStart - Monday 00:00 Vietnam time
 * @returns Saturday 23:59 of the same week
 */
export function weekEndOf(weekStart: Date): Date {
  return shiftVnDate(weekStart, SATURDAY_OFFSET_FROM_MONDAY, 23, 59);
}

/**
 * Determine which attendance week is open at `now`.
 * The week opens at 22:00 Saturday, and it opens the FOLLOWING week.
 * @param now - Current moment
 * @returns The open week
 */
export function getActiveWeek(now: Date): ScheduledWeek {
  // Sunday (ISO 7) is congruent to 0 mod 7, so it still resolves to 1 day since Saturday.
  const daysSinceSaturday = (vnWeekday(now) - SATURDAY + 7) % 7;

  let anchorOpen = shiftVnDate(now, -daysSinceSaturday, WEEK_OPEN_HOUR, 0);

  // The 22:00 Saturday opening is still ahead → the open week started last Saturday.
  if (anchorOpen.getTime() > now.getTime()) {
    anchorOpen = shiftVnDate(anchorOpen, -7, WEEK_OPEN_HOUR, 0);
  }

  // Opening Saturday + 2 days = the Monday starting the new week.
  return toWeek(weekStartOf(shiftVnDate(anchorOpen, 2, 0, 0)));
}

/**
 * Read a week marker from the query string — the only place a client string becomes a week marker.
 *
 * A valid string landing mid-week resolves to that week's Monday rather than throwing: a mid-week
 * value clearly means "the week containing this day", and returning that week is not silently wrong.
 * An unparseable string is a **programming error**, not a user error: the HTTP boundary already
 * rejected it in `weekStartQuerySchema`. Hence a plain `RangeError` rather than a framework
 * exception — this file stays pure, and `AllExceptionsFilter` turns it into a 500 with a stack in the
 * log, which is the right treatment for that class of error.
 * @param input - ISO string that passed `weekStartQuerySchema`; omitted = the open week
 * @param now - Current moment, used when `input` is omitted
 * @returns Monday 00:00 Vietnam time
 * @throws RangeError when the string is not a valid instant
 */
export function parseWeekStart(
  input: string | undefined,
  now: Date,
): WeekAnchor {
  if (input === undefined) return getActiveWeek(now).weekStart;

  const parsed = new Date(input);

  if (Number.isNaN(parsed.getTime())) {
    throw new RangeError(`parseWeekStart received a non-ISO string: ${input}`);
  }

  return weekStartOf(parsed);
}

/**
 * The weeks an admin may schedule: the open week and the next one. Past weeks are read-only.
 * @param now - Current moment
 * @returns Two weeks, the open one first
 */
export function getEditableWeeks(now: Date): ScheduledWeek[] {
  const active = getActiveWeek(now);

  return [active, toWeek(weekStartOf(shiftVnDate(active.weekStart, 7, 0, 0)))];
}

/**
 * When a week's Guild War takes place: 20:00 Saturday.
 * @param weekStart - Monday 00:00 of the week
 * @returns The Guild War battle time
 */
export function guildWarDateTime(weekStart: Date): Date {
  return shiftVnDate(
    weekStart,
    SATURDAY_OFFSET_FROM_MONDAY,
    GUILD_WAR_HOUR,
    GUILD_WAR_MINUTE,
  );
}

/**
 * How many matches a week's Guild War is played over: 2, then 1, then 2 again.
 *
 * `Math.abs` before the parity test rather than a bare `weeks % 2 === 0`: a past week gives a
 * NEGATIVE delta, and `%` in JavaScript keeps the sign of the dividend, so the parity has to be
 * computed off a magnitude to be right for reasons a reader can see.
 * @param weekStart - Monday 00:00 Vietnam time of the week
 * @returns 2 for the anchor week and every second week from it, 1 for the weeks between
 */
export function guildWarMatchCount(weekStart: Date): number {
  const weeksFromAnchor = Math.round(
    (weekStart.getTime() - GUILD_WAR_MATCH_COUNT_ANCHOR.getTime()) / WEEK_MS,
  );

  return Math.abs(weeksFromAnchor) % 2 === 0
    ? GUILD_WAR_MATCH_COUNT_EVEN
    : GUILD_WAR_MATCH_COUNT_ODD;
}

/**
 * Deterministic id of a week's Guild War session.
 * There is no unique constraint on the label any more, so the id is the key for an idempotent upsert.
 * @param weekStart - Monday 00:00 of the week
 * @returns An id of the form `gw-YYYY-MM-DD` from the Vietnam-time Monday
 */
export function guildWarSessionId(weekStart: Date): string {
  const { year, month, day } = vnParts(weekStart);

  return `gw-${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Build a session's display label from its battle time — the label is NOT stored, so changing the
 * battle time keeps the label correct.
 *
 * Both kinds open with weekday and battle time, so a list of days reads down one column. Guild War
 * then names itself, being the only day of the week that is not a scrim.
 *
 * @param dateTime - Battle time
 * @param isGuildWar - Whether this is the Guild War session
 * @returns A label like "Thứ 3 · 20:30" or "Thứ 7 · 20:00 · Bang Chiến"
 */
export function formatSessionLabel(
  dateTime: Date,
  isGuildWar: boolean,
): string {
  const weekday = WEEKDAY_NAMES[vnWeekday(dateTime)];
  const { hour, minute } = vnParts(dateTime);
  const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  if (isGuildWar) return `${weekday} · ${time} · Bang Chiến`;

  return `${weekday} · ${time}`;
}

/**
 * Whether the attendance deadline has passed.
 * @param deadline - The session's deadline
 * @param now - Current moment
 * @returns true when it has passed and attendance can no longer be recorded
 */
export function isDeadlinePassed(deadline: Date, now: Date): boolean {
  return now.getTime() > deadline.getTime();
}

/**
 * A session past its battle time is locked and its formation can no longer be edited.
 * Differs from `isDeadlinePassed` in what it compares against: the attendance deadline is a separate
 * moment before the battle, while this compares against the battle time itself. Exactly at the
 * battle time it is not yet locked.
 * @param dateTime - Battle time of the session
 * @param now - Current moment
 * @returns true when the battle is over
 */
export function isSessionLocked(dateTime: Date, now: Date): boolean {
  return dateTime.getTime() < now.getTime();
}
