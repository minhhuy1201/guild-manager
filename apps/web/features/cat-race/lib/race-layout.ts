import { SPRITE_COLUMNS, SPRITE_ROWS } from "./sprite-rows";

export interface Area {
  readonly width: number;
  readonly height: number;
}

/** Height of the sky band above the lanes, and the narrower one below `NARROW_WIDTH`. */
export const BAND_HEIGHT = 94;
export const BAND_HEIGHT_NARROW = 66;
export const NARROW_WIDTH = 600;
/** Fewest and most px a lane takes; more cats than fit make the track scroll instead of shrinking. */
export const LANE_MIN_HEIGHT = 22;
export const LANE_MAX_HEIGHT = 56;
/** The name column's share of the width, and its limits in px. */
const NAME_COLUMN_SHARE = 0.2;
const NAME_COLUMN_MIN = 108;
const NAME_COLUMN_MAX = 196;
/** Gap between the name column and a cat standing on the start line, in px. */
const START_GAP = 6;
/** Free strip right of the finish line, in px. */
export const FINISH_MARGIN = 46;
/** Share of a lane the sprite fills, and the tallest sprite in px. */
const CAT_HEIGHT_SHARE = 0.86;
const MAX_CAT_HEIGHT = 46;

/** Where everything sits for one canvas width and one number of cats. */
export interface LaneLayout {
  /** Height of the sky band; the lanes start right under it */
  readonly band: number;
  readonly laneHeight: number;
  /** Height of the band and all lanes together; the canvas is at least as tall as the viewport */
  readonly contentHeight: number;
  readonly nameColumn: number;
  /** Left edge of a cat at progress 0 */
  readonly startX: number;
  /** The finish line */
  readonly finishX: number;
  /** Distance a cat's left edge covers between progress 0 and 1 */
  readonly travel: number;
  readonly catWidth: number;
  readonly catHeight: number;
}

/** The lanes that intersect the viewport, both ends included; `last < first` when none do. */
export interface LaneRange {
  readonly first: number;
  readonly last: number;
}

/**
 * One lane per cat, every cat on the same start line.
 * @param count - Cats in the race
 * @param viewport - Visible size of the track area
 * @returns The layout
 */
export function laneLayout(count: number, viewport: Area): LaneLayout {
  const band = viewport.width < NARROW_WIDTH ? BAND_HEIGHT_NARROW : BAND_HEIGHT;
  const laneHeight = Math.min(
    LANE_MAX_HEIGHT,
    Math.max(LANE_MIN_HEIGHT, (viewport.height - band) / Math.max(1, count))
  );
  const catHeight = Math.min(MAX_CAT_HEIGHT, Math.floor(laneHeight * CAT_HEIGHT_SHARE));
  const catWidth = Math.round((catHeight * SPRITE_COLUMNS) / SPRITE_ROWS);
  const nameColumn = Math.min(
    NAME_COLUMN_MAX,
    Math.max(NAME_COLUMN_MIN, Math.round(viewport.width * NAME_COLUMN_SHARE))
  );
  const startX = nameColumn + START_GAP;
  const finishX = viewport.width - FINISH_MARGIN;

  return {
    band,
    laneHeight,
    contentHeight: band + count * laneHeight,
    nameColumn,
    startX,
    finishX,
    // The nose, not the tail, touches the finish line at progress 1.
    travel: finishX - catWidth - startX,
    catWidth,
    catHeight,
  };
}

/**
 * Vertical centre of a lane, measured from the top of the content.
 * @param index - Lane number from the top
 * @param layout - The layout
 * @returns The y coordinate
 */
export function laneCenterY(index: number, layout: LaneLayout): number {
  return layout.band + (index + 0.5) * layout.laneHeight;
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

/**
 * Where a share of the track is drawn for the start post and the distance marks: the cat's nose.
 * @param share - 0..1 along the track
 * @param layout - The layout
 * @returns The x coordinate
 */
export function markX(share: number, layout: LaneLayout): number {
  return progressX(share, layout) + layout.catWidth;
}

/**
 * The lanes a scrolled viewport shows, so a field of 240 paints a few dozen.
 * @param layout - The layout
 * @param count - Lanes in the race
 * @param scrollTop - How far the lanes are scrolled, in px
 * @param viewHeight - Height of the viewport, band included
 * @returns The first and last lane in view
 */
export function visibleLanes(
  layout: LaneLayout,
  count: number,
  scrollTop: number,
  viewHeight: number
): LaneRange {
  return {
    first: Math.max(0, Math.floor(scrollTop / layout.laneHeight)),
    last: Math.min(count - 1, Math.floor((scrollTop + viewHeight - layout.band) / layout.laneHeight)),
  };
}
