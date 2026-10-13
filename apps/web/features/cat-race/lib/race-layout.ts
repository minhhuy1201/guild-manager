export type RaceOrientation = "horizontal" | "vertical";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Area {
  readonly width: number;
  readonly height: number;
}

/** Visible window of the track as shares of it: `from` 0..1 is the start, `to` the finish. */
export interface TrackView {
  readonly from: number;
  readonly to: number;
}

/** Most rows the packed starting block uses; more cats make more columns instead. */
export const MAX_PACK_ROWS = 24;
/** Share of the track's length the packed block may take, behind the start line. */
const PACK_ZONE = 0.22;
/** Where the start line and the finish line sit along the track, as shares of its length. */
const START_LINE = 0.26;
const FINISH_LINE = 0.94;
/** Margin kept free around the cats, in px. */
const EDGE_PADDING = 12;
const MIN_CAT_SIZE = 10;
const MAX_CAT_SIZE = 56;

/** The whole track, before the camera zooms. */
export const FULL_VIEW: TrackView = { from: 0, to: 1 };

/**
 * The two axes of the track: `along` runs start to finish, `across` is the lane axis.
 * @param area - Canvas size
 * @param orientation - Whether the track runs left to right or top to bottom
 * @returns Lengths of both axes
 */
function axesOf(area: Area, orientation: RaceOrientation) {
  return orientation === "horizontal"
    ? { alongLength: area.width, acrossLength: area.height }
    : { alongLength: area.height, acrossLength: area.width };
}

/**
 * Turn a position on the two axes into a canvas point.
 * @param along - Distance along the track
 * @param across - Distance across the lanes
 * @param orientation - Track direction
 * @returns The canvas point
 */
export function toPoint(
  along: number,
  across: number,
  orientation: RaceOrientation
): Point {
  return orientation === "horizontal"
    ? { x: along, y: across }
    : { x: across, y: along };
}

/**
 * Split a canvas point into the two axes; the inverse of `toPoint`.
 * @param point - Canvas point
 * @param orientation - Track direction
 * @returns Its along and across
 */
export function fromPoint(point: Point, orientation: RaceOrientation) {
  return orientation === "horizontal"
    ? { along: point.x, across: point.y }
    : { along: point.y, across: point.x };
}

/**
 * Dense grid behind the start line for the whole field.
 * @param keys - Cats, in the order they take slots
 * @param area - Canvas size
 * @param orientation - Track direction
 * @returns A slot centre per cat
 */
export function packSlots(
  keys: readonly string[],
  area: Area,
  orientation: RaceOrientation = "horizontal"
): Map<string, Point> {
  const { alongLength, acrossLength } = axesOf(area, orientation);
  const rows = Math.max(1, Math.min(MAX_PACK_ROWS, keys.length));
  const columns = Math.ceil(keys.length / rows);
  const rowStep = (acrossLength - 2 * EDGE_PADDING) / rows;
  const columnStep = (alongLength * PACK_ZONE - EDGE_PADDING) / columns;

  return new Map(
    keys.map((key, index) => {
      const row = index % rows;
      const column = Math.floor(index / rows);

      return [
        key,
        toPoint(
          EDGE_PADDING + (column + 0.5) * columnStep,
          EDGE_PADDING + (row + 0.5) * rowStep,
          orientation
        ),
      ];
    })
  );
}

/**
 * One lane per cat, evenly spread, centred on the start line.
 * @param keys - Cats, in lane order (first key takes the first lane)
 * @param area - Canvas size
 * @param orientation - Track direction
 * @returns A start-line point per cat
 */
export function laneSlots(
  keys: readonly string[],
  area: Area,
  orientation: RaceOrientation = "horizontal"
): Map<string, Point> {
  const { alongLength, acrossLength } = axesOf(area, orientation);
  const step = (acrossLength - 2 * EDGE_PADDING) / Math.max(1, keys.length);

  return new Map(
    keys.map((key, index) => [
      key,
      toPoint(
        alongLength * START_LINE,
        EDGE_PADDING + (index + 0.5) * step,
        orientation
      ),
    ])
  );
}

/**
 * Where a cat at a given progress stands, for the camera's current window.
 * @param progress - 0..1 along the track
 * @param across - The cat's lane coordinate
 * @param view - Visible window of the track
 * @param area - Canvas size
 * @param orientation - Track direction; vertical starts at the top and finishes at the bottom
 * @returns The canvas point
 */
export function projectProgress(
  progress: number,
  across: number,
  view: TrackView,
  area: Area,
  orientation: RaceOrientation
): Point {
  const { alongLength } = axesOf(area, orientation);
  const start = alongLength * START_LINE;
  const finish = alongLength * FINISH_LINE;
  const share = (progress - view.from) / (view.to - view.from);

  return toPoint(start + share * (finish - start), across, orientation);
}

/**
 * Along coordinate of the finish line.
 * @param area - Canvas size
 * @param orientation - Track direction
 * @returns Distance from the track's origin
 */
export function finishAlong(area: Area, orientation: RaceOrientation): number {
  return axesOf(area, orientation).alongLength * FINISH_LINE;
}

/**
 * Along coordinate of the start line.
 * @param area - Canvas size
 * @param orientation - Track direction
 * @returns Distance from the track's origin
 */
export function startAlong(area: Area, orientation: RaceOrientation): number {
  return axesOf(area, orientation).alongLength * START_LINE;
}

/**
 * Sprite size that lets the packed block, or the lanes, fit.
 * @param count - Cats on screen
 * @param area - Canvas size
 * @param orientation - Track direction
 * @returns Sprite edge in px
 */
export function catSize(
  count: number,
  area: Area,
  orientation: RaceOrientation = "horizontal"
): number {
  const { alongLength, acrossLength } = axesOf(area, orientation);
  const rows = Math.max(1, Math.min(MAX_PACK_ROWS, count));
  const columns = Math.ceil(count / rows);
  const fit = Math.min(
    (acrossLength - 2 * EDGE_PADDING) / rows,
    (alongLength * PACK_ZONE - EDGE_PADDING) / columns
  );

  return Math.max(MIN_CAT_SIZE, Math.min(MAX_CAT_SIZE, Math.floor(fit)));
}
