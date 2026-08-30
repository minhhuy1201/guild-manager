/**
 * A browser renders `<input type="datetime-local">` in its own locale, so an English machine shows
 * mm/dd/yyyy, and `<input type="time">` shows AM/PM there. The form picks the day on a calendar and
 * takes the time as text so it stays on dd/MM/yyyy and 24h HH:mm whatever the machine's locale is;
 * this is where they convert to and from the local "YYYY-MM-DDTHH:mm" string [[datetime-input]] uses.
 */

const TIME_DIGITS = 4;
const MONTHS_IN_YEAR = 12;
const HOURS_IN_DAY = 24;
const MINUTES_IN_HOUR = 60;

const DISPLAY_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const DISPLAY_TIME = /^(\d{2}):(\d{2})$/;

/**
 * Days in a month, leap years included.
 * @param year - Calendar year
 * @param month - Month from 1 to 12
 * @returns Number of days in that month
 */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Split the local string into the two displayed inputs.
 * @param value - "YYYY-MM-DDTHH:mm", empty when unset
 * @param defaultTime - Time prefilled when there is no value, as HH:mm
 * @returns The date as dd/MM/yyyy and the time as HH:mm
 */
export function splitLocalValue(
  value: string,
  defaultTime = ""
): { date: string; time: string } {
  const [datePart, timePart] = value.split("T");

  if (!datePart || !timePart) return { date: "", time: defaultTime };

  const [year, month, day] = datePart.split("-");

  return { date: `${day}/${month}/${year}`, time: timePart };
}

/**
 * Join the two displayed inputs back into the local string.
 * @param date - Date as dd/MM/yyyy
 * @param time - Time as HH:mm
 * @returns "YYYY-MM-DDTHH:mm", empty when the date/time is not valid
 */
export function joinLocalValue(date: string, time: string): string {
  const dateMatch = DISPLAY_DATE.exec(date);
  const timeMatch = DISPLAY_TIME.exec(time);

  if (!dateMatch || !timeMatch) return "";

  const [, day, month, year] = dateMatch;
  const [, hour, minute] = timeMatch;

  if (Number(month) < 1 || Number(month) > MONTHS_IN_YEAR) return "";
  if (Number(day) < 1 || Number(day) > daysInMonth(Number(year), Number(month)))
    return "";
  if (Number(hour) >= HOURS_IN_DAY || Number(minute) >= MINUTES_IN_HOUR)
    return "";

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Turn a `Date` into the date input's displayed string.
 * @param date - Date to display
 * @returns dd/MM/yyyy in local time
 */
export function toDisplayDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${pad(date.getDate())}/${pad(
    date.getMonth() + 1
  )}/${date.getFullYear()}`;
}

/**
 * Turn the date input's string into a `Date` so the calendar highlights the right day.
 * @param date - dd/MM/yyyy string
 * @returns The `Date` at midnight, or undefined when the date is not valid
 */
export function parseDisplayDate(date: string): Date | undefined {
  const joined = joinLocalValue(date, "00:00");

  if (!joined) return undefined;

  const [year, month, day] = joined.slice(0, 10).split("-").map(Number);

  return new Date(year, month - 1, day);
}

/**
 * Insert separators into the string the user is typing.
 * @param raw - Raw string in the input
 * @param separator - Separator between groups
 * @param groups - Length of each digit group
 * @returns The separated string, with any excess trimmed
 */
function mask(raw: string, separator: string, groups: number[]): string {
  const digits = raw.replace(/\D/g, "").slice(0, sum(groups));
  const parts: string[] = [];
  let cursor = 0;

  for (const size of groups) {
    if (cursor >= digits.length) break;

    parts.push(digits.slice(cursor, cursor + size));
    cursor += size;
  }

  return parts.join(separator);
}

/**
 * Sum of a number list.
 * @param values - Numbers to add
 * @returns Their sum
 */
function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * Progressively format the time the user is typing into 24h HH:mm.
 * @param raw - Raw string in the input
 * @returns The time string with `:` inserted
 */
export function maskTime(raw: string): string {
  return mask(raw, ":", [2, TIME_DIGITS - 2]);
}
