import type { ClassOutlookRow } from "@guild/shared/lib";

/**
 * Order the rows by their "after" head-count, largest first; equal counts keep display order.
 * @param rows - Rows in display order
 * @returns A new array, sorted
 */
export function sortByAfter(rows: readonly ClassOutlookRow[]): ClassOutlookRow[] {
  return [...rows].sort((a, b) => b.after - a.after);
}

/**
 * The class that gains the most members.
 * @param rows - Rows in display order
 * @returns The row with the largest positive change, or null when no class grows
 */
export function biggestGainer(rows: readonly ClassOutlookRow[]): ClassOutlookRow | null {
  return rows.reduce<ClassOutlookRow | null>(
    (best, row) => (row.delta > 0 && row.delta > (best?.delta ?? 0) ? row : best),
    null
  );
}

/**
 * A signed change for display.
 * @param delta - The change
 * @returns "+N", "-N" or "0"
 */
export function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;

  return delta < 0 ? `-${Math.abs(delta)}` : "0";
}
