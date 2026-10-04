/**
 * A leave's days as members write them.
 * Built from the string, not through `Date`: the days are Vietnam calendar days already, and parsing
 * one would reinterpret it in the viewer's timezone.
 * @param startDate - First day, `YYYY-MM-DD`
 * @param endDate - Last day, `YYYY-MM-DD`
 * @returns The range as `dd/mm - dd/mm`
 */
export function formatLeaveRange(startDate: string, endDate: string): string {
  const dayMonth = (key: string) => `${key.slice(8, 10)}/${key.slice(5, 7)}`;

  return `${dayMonth(startDate)} - ${dayMonth(endDate)}`;
}
