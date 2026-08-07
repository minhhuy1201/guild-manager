import type { FormationWeek } from "../types/session-formation";

/**
 * Monday of the open attendance week among the weeks that still hold data.
 * The list is newest first and reaches into next week, so the first entry is
 * NOT the open week — only the server's flag says which one is.
 * @param weeks - Weeks that still hold formation data, newest first
 * @returns Monday of the open week, falling back to the newest week
 */
export function findActiveWeekStart(weeks: FormationWeek[]): string | null {
  const active = weeks.find((week) => week.isActive);

  return active?.weekStart ?? weeks[0]?.weekStart ?? null;
}

/**
 * Whether formations of a week may still be rearranged. Past weeks are
 * read-only; the open week and the ones after it stay editable, and each
 * battle's own `locked` flag decides the rest.
 * @param weekStart - Monday of the week on screen
 * @param activeWeekStart - Monday of the open week
 * @returns true when the week is the open one or a later one
 */
export function isWeekEditable(
  weekStart: string | undefined,
  activeWeekStart: string | null
): boolean {
  if (!weekStart || !activeWeekStart) return false;

  return new Date(weekStart).getTime() >= new Date(activeWeekStart).getTime();
}
