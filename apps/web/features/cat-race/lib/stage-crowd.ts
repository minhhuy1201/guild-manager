import type { LaneLayout } from "./race-layout";
import { CROWD_SHIRT_COLORS, CROWD_SKIN_COLORS } from "./stage-palette";

/** One spectator behind the rail. */
export interface Spectator {
  readonly x: number;
  /** 0 is the front row, 1 the back row */
  readonly row: number;
  readonly skin: string;
  readonly shirt: string;
  /** Bob phase in radians, so the crowd does not move in lockstep */
  readonly phase: number;
}

const SPECTATOR_SPACING = 6;
const SPECTATOR_ROWS = 2;
const BACK_ROW_OFFSET = 3;
const CROWD_INSET = 4;

/**
 * Fill the stands right of the name column, two rows deep.
 * @param width - Canvas width in px
 * @param layout - The layout
 * @param random - Source of 0..1 numbers
 * @returns The spectators
 */
export function buildCrowd(width: number, layout: LaneLayout, random: () => number): Spectator[] {
  const crowd: Spectator[] = [];
  for (let x = layout.nameColumn + CROWD_INSET; x < width; x += SPECTATOR_SPACING) {
    for (let row = 0; row < SPECTATOR_ROWS; row += 1) {
      crowd.push({
        x: x + (row ? BACK_ROW_OFFSET : 0),
        row,
        skin: CROWD_SKIN_COLORS[Math.floor(random() * CROWD_SKIN_COLORS.length)],
        shirt: CROWD_SHIRT_COLORS[Math.floor(random() * CROWD_SHIRT_COLORS.length)],
        phase: random() * Math.PI * 2,
      });
    }
  }

  return crowd;
}
