/**
 * Columns of the dashboard grid; every per-row split below (1, 2, 3) divides it evenly. Must match
 * the literal `sm:grid-cols-6` in `attendance-summary-dashboard.tsx` (Tailwind needs the literal).
 */
const SUMMARY_GRID_COLUMNS = 6;

/** Full class names, so Tailwind's scanner sees them: a template string would be purged. */
const SM_SPAN: Record<number, string> = {
  3: "sm:col-span-3",
  6: "sm:col-span-6",
};
const LG_SPAN: Record<number, string> = {
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  6: "lg:col-span-6",
};

/**
 * Column span of one card so the last, partly filled row stretches over the whole width instead of
 * leaving a card alone beside empty cells.
 * @param index - Card position, from 0
 * @param count - Number of cards
 * @param perRow - Cards per full row at this breakpoint
 * @returns Columns the card takes
 */
function spanFor(index: number, count: number, perRow: number): number {
  const remainder = count % perRow;
  const isInLastRow = remainder > 0 && index >= count - remainder;
  const share = isInLastRow ? remainder : Math.min(perRow, count);

  return SUMMARY_GRID_COLUMNS / share;
}

/**
 * Span classes for one dashboard card in a 6-column grid: two per row from `sm`, three per row from
 * `lg`, with the trailing row sharing the full width whatever the number of cards.
 * @param index - Card position, from 0
 * @param count - Number of cards
 * @returns Responsive `col-span` classes
 */
export function summaryCardSpanClass(index: number, count: number): string {
  return `${SM_SPAN[spanFor(index, count, 2)]} ${LG_SPAN[spanFor(index, count, 3)]}`;
}
