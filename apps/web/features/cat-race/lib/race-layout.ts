import { SPRITE_COLUMNS, SPRITE_ROWS } from "./race-sprites";

export interface Area {
  readonly width: number;
  readonly height: number;
}

/** Fewest and most px a lane takes; more cats than fit make the track scroll instead of shrinking. */
export const LANE_MIN_HEIGHT = 22;
export const LANE_MAX_HEIGHT = 64;
/** The name column's share of the width, and its limits in px. */
const NAME_COLUMN_SHARE = 0.22;
const NAME_COLUMN_MIN = 96;
const NAME_COLUMN_MAX = 180;
/** Free strip right of the finish line, in px. */
const FINISH_MARGIN = 24;
/** Share of a lane the sprite fills, and the tallest sprite in px. */
const CAT_HEIGHT_SHARE = 0.75;
const MAX_CAT_HEIGHT = 48;

/** Where everything sits for one canvas width and one number of cats. */
export interface LaneLayout {
  readonly laneHeight: number;
  /** Height of all lanes together; the canvas is at least as tall as the viewport */
  readonly contentHeight: number;
  readonly nameColumn: number;
  /** Left edge of a cat at progress 0: the start line */
  readonly startX: number;
  /** The finish line */
  readonly finishX: number;
  /** Distance a cat's left edge covers between progress 0 and 1 */
  readonly travel: number;
  readonly catWidth: number;
  readonly catHeight: number;
}

/**
 * One lane per cat, every cat on the same start line.
 * @param count - Cats in the race
 * @param viewport - Visible size of the track area
 * @returns The layout
 */
export function laneLayout(count: number, viewport: Area): LaneLayout {
  const laneHeight = Math.min(
    LANE_MAX_HEIGHT,
    Math.max(LANE_MIN_HEIGHT, viewport.height / Math.max(1, count))
  );
  const catHeight = Math.min(MAX_CAT_HEIGHT, Math.floor(laneHeight * CAT_HEIGHT_SHARE));
  const catWidth = Math.round((catHeight * SPRITE_COLUMNS) / SPRITE_ROWS);
  const nameColumn = Math.min(
    NAME_COLUMN_MAX,
    Math.max(NAME_COLUMN_MIN, Math.round(viewport.width * NAME_COLUMN_SHARE))
  );
  const finishX = viewport.width - FINISH_MARGIN;

  return {
    laneHeight,
    contentHeight: count * laneHeight,
    nameColumn,
    startX: nameColumn,
    finishX,
    // The nose, not the tail, touches the finish line at progress 1.
    travel: finishX - catWidth - nameColumn,
    catWidth,
    catHeight,
  };
}

/**
 * Vertical centre of a lane.
 * @param index - Lane number from the top
 * @param layout - The layout
 * @returns The y coordinate
 */
export function laneCenterY(index: number, layout: LaneLayout): number {
  return (index + 0.5) * layout.laneHeight;
}

/**
 * Left edge of a cat at some progress; the same for every cat with the same progress.
 * @param progress - 0..1 along the track
 * @param layout - The layout
 * @returns The x coordinate
 */
export function progressX(progress: number, layout: LaneLayout): number {
  return layout.startX + progress * layout.travel;
}
