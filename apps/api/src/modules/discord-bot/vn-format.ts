import { vnParts } from '@guild/shared/lib';

/**
 * Two-digit string of a number, for a wall clock or a calendar field.
 * @param value - The number, 0-99
 * @returns The number padded to two digits
 */
function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Wall-clock time of an instant, read in Vietnam time.
 * @param date - The instant
 * @returns A `HH:mm` string
 */
export function formatVnTime(date: Date): string {
  const { hour, minute } = vnParts(date);

  return `${pad(hour)}:${pad(minute)}`;
}

/**
 * Day and month of an instant, read in Vietnam time.
 * @param date - The instant
 * @returns A `dd/MM` string
 */
export function formatVnDayMonth(date: Date): string {
  const { day, month } = vnParts(date);

  return `${pad(day)}/${pad(month)}`;
}
