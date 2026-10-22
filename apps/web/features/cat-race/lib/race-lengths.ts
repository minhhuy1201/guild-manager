import type { LaneLayout } from "./race-layout";

/**
 * A gap on the track in cat bodies, the unit the board and the photo finish speak.
 * @param progressGap - Share of the track between two cats
 * @param layout - The layout the gap is seen on; it sets how long the track is
 * @returns Cat bodies, never negative
 */
export function lengthsBehind(progressGap: number, layout: LaneLayout): number {
  return Math.max(0, (progressGap * layout.travel) / layout.catWidth);
}

/**
 * A gap in cat bodies as Vietnamese text.
 * @param lengths - Cat bodies
 * @returns One decimal and a comma, e.g. "1,2"
 */
export function formatLengths(lengths: number): string {
  return lengths.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
