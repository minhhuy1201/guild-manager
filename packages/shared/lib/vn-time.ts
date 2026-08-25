/**
 * The Vietnam clock — a shared time primitive that knows nothing about battles.
 *
 * Vietnam is a fixed UTC+7 with no DST, so the offset is a constant rather than a
 * timezone database.
 *
 * The module's single convention: every function TAKES and RETURNS a real UTC
 * `Date`, never a "Vietnam time already added" one. Only *reading* calendar parts
 * (weekday, day, hour) is interpreted in Vietnam time.
 */

/** Vietnam's offset from UTC (UTC+7, no DST). */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Calendar parts of an instant, already read in Vietnam time. */
export interface VnParts {
  year: number;
  /** 1-12, not 0-11 like `Date.getUTCMonth()`. */
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/**
 * Shift a UTC instant onto the "Vietnam clock" so calendar parts can be read with `getUTC*()`.
 * @param date - Real UTC instant
 * @returns A Date meant only for reading, NOT a valid instant
 */
function toVnClock(date: Date): Date {
  return new Date(date.getTime() + VN_OFFSET_MS);
}

/**
 * ISO weekday in Vietnam time.
 * @param date - Real UTC instant
 * @returns 1 = Monday, …, 7 = Sunday
 */
export function vnWeekday(date: Date): number {
  const day = toVnClock(date).getUTCDay();

  // getUTCDay() puts Sunday at 0; ISO puts Sunday at 7.
  return day === 0 ? 7 : day;
}

/**
 * Calendar parts of an instant, read in Vietnam time.
 * @param date - Real UTC instant
 * @returns Year, month (1-12), day, hour and minute in Vietnam time
 */
export function vnParts(date: Date): VnParts {
  const vn = toVnClock(date);

  return {
    year: vn.getUTCFullYear(),
    month: vn.getUTCMonth() + 1,
    day: vn.getUTCDate(),
    hour: vn.getUTCHours(),
    minute: vn.getUTCMinutes(),
  };
}

/**
 * Shift an instant by `deltaDays` days, then pin it to a given Vietnam hour/minute.
 * @param base - Source instant (real UTC)
 * @param deltaDays - Days to add (negative moves back)
 * @param hour - Vietnam hour to set (0-23)
 * @param minute - Minute to set (0-59)
 * @returns The UTC Date matching the requested Vietnam wall clock
 */
export function shiftVnDate(
  base: Date,
  deltaDays: number,
  hour: number,
  minute: number
): Date {
  const vn = toVnClock(base);
  const shifted = Date.UTC(
    vn.getUTCFullYear(),
    vn.getUTCMonth(),
    vn.getUTCDate() + deltaDays,
    hour,
    minute
  );

  return new Date(shifted - VN_OFFSET_MS);
}

/**
 * Pin an instant to a given hour/minute within its own Vietnam day.
 * @param base - Source instant (real UTC)
 * @param hour - Vietnam hour to set (0-23)
 * @param minute - Minute to set (0-59)
 * @returns The UTC Date matching the requested Vietnam wall clock
 */
export function atVnTime(base: Date, hour: number, minute: number): Date {
  return shiftVnDate(base, 0, hour, minute);
}
