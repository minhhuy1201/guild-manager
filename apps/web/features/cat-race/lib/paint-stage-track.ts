import { markX } from "./race-layout";
import { STAGE_PALETTE } from "./stage-palette";
import type { StageView } from "./stage-view";

/** The viewport plus the lane to wash in gold. */
export interface TrackView extends StageView {
  /** Lane of the cat in front while racing, else null */
  readonly leaderLane: number | null;
}

const SPECKS_DARK = 7;
const SPECKS_TOTAL = 10;
const SPECK_SIZE = 2;
const SPECK_LIGHT_HEIGHT = 1;
const SPECK_MARGIN = 3;
const DIVIDER_STEP = 14;
const DIVIDER_DASH = 7;
const QUARTER_SHARES = [0.25, 0.5, 0.75] as const;
const QUARTER_STEP = 8;
const QUARTER_DASH = 4;
const START_LINE_WIDTH = 3;
const FINISH_SQUARE = 6;
const FINISH_COLUMNS = 3;

/**
 * A fixed pseudo-random number for a lane and a speck, so the dirt does not shimmer.
 * @param lane - Lane number
 * @param speck - Speck number
 * @returns 0..1
 */
function hash(lane: number, speck: number): number {
  const value = Math.sin(lane * 127.1 + speck * 311.7) * 43758.5453;

  return value - Math.floor(value);
}

/**
 * Paint the dirt of one lane: its tone, specks and bottom dashes.
 * @param context - Where to paint
 * @param view - The viewport
 * @param lane - Lane number
 */
function paintLane(context: CanvasRenderingContext2D, view: TrackView, lane: number) {
  const { layout, width } = view;
  const y = layout.band + lane * layout.laneHeight - view.top;
  const room = width - layout.startX;
  context.fillStyle = lane % 2 ? STAGE_PALETTE.earthAlt : STAGE_PALETTE.earth;
  context.fillRect(layout.nameColumn, y, width - layout.nameColumn, layout.laneHeight);
  for (let speck = 0; speck < SPECKS_TOTAL; speck += 1) {
    const isLight = speck >= SPECKS_DARK;
    context.fillStyle = isLight ? STAGE_PALETTE.earthSpeckLight : STAGE_PALETTE.earthSpeck;
    context.fillRect(
      layout.startX + hash(lane, speck) * room,
      y + SPECK_MARGIN + hash(speck, lane) * (layout.laneHeight - SPECK_MARGIN * 2),
      SPECK_SIZE,
      isLight ? SPECK_LIGHT_HEIGHT : SPECK_SIZE
    );
  }
  context.fillStyle = STAGE_PALETTE.laneDivider;
  for (let x = layout.startX; x < width; x += DIVIDER_STEP) {
    context.fillRect(x, y + layout.laneHeight - 1, DIVIDER_DASH, 1);
  }
}

/**
 * Paint the gold wash over the leader's lane.
 * @param context - Where to paint
 * @param view - The viewport
 * @param lane - The leader's lane
 */
function paintLeaderLane(context: CanvasRenderingContext2D, view: TrackView, lane: number) {
  const { layout, width } = view;
  const y = layout.band + lane * layout.laneHeight - view.top;
  const wash = context.createLinearGradient(layout.nameColumn, 0, width, 0);
  wash.addColorStop(0, STAGE_PALETTE.leaderLaneFrom);
  wash.addColorStop(1, STAGE_PALETTE.leaderLaneTo);
  context.fillStyle = wash;
  context.fillRect(layout.nameColumn, y, width - layout.nameColumn, layout.laneHeight);
}

/**
 * Paint the 3-column chequered finish line down the whole track.
 * @param context - Where to paint
 * @param view - The viewport
 */
function paintFinishLine(context: CanvasRenderingContext2D, view: TrackView) {
  const { layout } = view;
  for (let y = layout.band; y < view.height; y += FINISH_SQUARE) {
    for (let column = 0; column < FINISH_COLUMNS; column += 1) {
      const row = Math.floor((y - layout.band + view.top) / FINISH_SQUARE);
      context.fillStyle = (row + column) % 2 ? STAGE_PALETTE.paper : STAGE_PALETTE.night;
      context.fillRect(layout.finishX + column * FINISH_SQUARE, y, FINISH_SQUARE, FINISH_SQUARE);
    }
  }
}

/**
 * Paint the lanes in view, the quarter marks, the leader's wash, the start line and the finish
 * line. The caller clips to the area under the sky band and paints the cats afterwards.
 * @param context - Where to paint
 * @param view - The viewport
 */
export function paintStageTrack(context: CanvasRenderingContext2D, view: TrackView) {
  const { layout, lanes } = view;
  for (let lane = lanes.first; lane <= lanes.last; lane += 1) paintLane(context, view, lane);
  context.fillStyle = STAGE_PALETTE.quarterLine;
  for (const share of QUARTER_SHARES) {
    const x = markX(share, layout);
    for (let y = layout.band; y < view.height; y += QUARTER_STEP) context.fillRect(x, y, 1, QUARTER_DASH);
  }
  const { leaderLane } = view;
  if (leaderLane !== null && leaderLane >= lanes.first && leaderLane <= lanes.last) {
    paintLeaderLane(context, view, leaderLane);
  }
  context.fillStyle = STAGE_PALETTE.paper;
  context.fillRect(markX(0, layout) - 1, layout.band, START_LINE_WIDTH, view.height - layout.band);
  paintFinishLine(context, view);
}
