import { shiftVnDate, vnParts } from "@guild/shared/lib";

/**
 * How many weeks back the History screen offers, the open one included.
 *
 * Three: the open week, the one that just closed, and the one before it. That covers the only
 * question anyone actually asks - "tuần rồi tôi có điểm danh không?" - and stops the picker from
 * turning into a long list of weeks nobody reopens.
 */
export const HISTORY_WEEK_COUNT = 3;

/** Days from Monday to the Saturday that closes the attendance week. */
const MONDAY_TO_SATURDAY = 5;

/** One selectable week on the History screen. */
export interface HistoryWeekOption {
  /** Monday 00:00 of the week (ISO) - what the API takes as `weekStart` */
  weekStart: string;
  /** The week as "07/09 - 12/09", read on the Vietnam clock */
  label: string;
  /** Whether this is the week currently open for marking */
  isCurrent: boolean;
}

/**
 * Pad a number to two digits.
 * @param value - Number to pad
 * @returns The value as a two-character string
 */
function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * A date as dd/MM on the Vietnam clock.
 * Not `formatDayMonth`: that reads the browser's clock, and a Monday 00:00 in Vietnam is still
 * Sunday for anyone west of it - the label would name the wrong day.
 * @param date - The instant to read
 * @returns The date as dd/MM
 */
function vnDayMonth(date: Date): string {
  const { day, month } = vnParts(date);

  return `${pad(day)}/${pad(month)}`;
}

/**
 * The weeks the History screen can show, newest first.
 *
 * Derived from the open week rather than asked of the API: weeks are a fixed Monday-to-Saturday
 * grid, so listing them needs no round trip, and a week with no data simply shows an empty table.
 *
 * @param currentWeekStart - Monday 00:00 of the open week (ISO), from `/battle-sessions/current-week`
 * @param count - How many weeks to offer, the open one included
 * @returns The options, the open week first
 */
export function historyWeekOptions(
  currentWeekStart: string,
  count: number = HISTORY_WEEK_COUNT
): HistoryWeekOption[] {
  const current = new Date(currentWeekStart);

  return Array.from({ length: count }, (_, index) => {
    const monday = shiftVnDate(current, -7 * index, 0, 0);
    const saturday = shiftVnDate(monday, MONDAY_TO_SATURDAY, 0, 0);

    return {
      weekStart: monday.toISOString(),
      label: `${vnDayMonth(monday)} - ${vnDayMonth(saturday)}`,
      isCurrent: index === 0,
    };
  });
}
