const pad = (value: number) => String(value).padStart(2, "0");

/**
 * The calendar day a date picker click stands for, as `YYYY-MM-DD`.
 * Read in the viewer's own calendar: a click yields local midnight, and going through UTC would
 * shift it a day for anyone east of Greenwich.
 * @param date - A date from the picker
 * @returns The day
 */
export function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Local midnight of a `YYYY-MM-DD` day, for the picker's `disabled` matcher.
 * @param key - A day
 * @returns The date
 */
export function fromDayKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);

  return new Date(year, month - 1, day);
}
