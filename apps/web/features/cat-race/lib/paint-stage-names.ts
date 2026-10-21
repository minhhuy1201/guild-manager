import { STAGE_PALETTE } from "./stage-palette";
import { bodyFont, type StageFonts } from "./stage-text";
import type { StageView } from "./stage-view";

/** Name text size limits in px; it follows the lane height between them. */
export const NAME_FONT_MIN = 11;
export const NAME_FONT_MAX = 14;
const NAME_FONT_LANE_SHARE = 0.42;
const NAME_WEIGHT = 600;
const NAME_WEIGHT_LEADER = 700;
const MARK_X = 8;
const MARK_SIZE = 8;
const NAME_X = 24;
const RANK_FONT_PX = 11;
const RANK_FONT_WEIGHT = 700;
const RANK_RIGHT_PADDING = 8;
/** Free room kept right of the name for the rank number. */
const RANK_ROOM = 22;
const MEDAL_RANKS = 3;

/** What the name column shows beside the track. */
export interface NameColumn extends StageView {
  /** Cat keys from the top lane down */
  readonly laneOrder: readonly string[];
  readonly fitted: ReadonlyMap<string, string>;
  readonly colors: ReadonlyMap<string, string>;
  /** Place of each cat while racing, 1 for the leader; null hides the numbers */
  readonly places: ReadonlyMap<string, number> | null;
  readonly leaderKey: string | null;
  readonly fonts: StageFonts;
}

/**
 * Width a name may take before it is cut with an ellipsis.
 * @param nameColumn - Width of the name column
 * @returns Room in px
 */
export function nameRoom(nameColumn: number): number {
  return nameColumn - NAME_X - RANK_RIGHT_PADDING - RANK_ROOM;
}

/**
 * Text size of a name for a lane height.
 * @param laneHeight - Lane height in px
 * @returns Size in px
 */
export function nameFontPx(laneHeight: number): number {
  return Math.min(NAME_FONT_MAX, Math.max(NAME_FONT_MIN, laneHeight * NAME_FONT_LANE_SHARE));
}

/**
 * Paint the wooden name column: class square, name (the leader in bold gold) and, only while
 * racing, the live place at the right edge (top 3 in gold).
 * @param context - Where to paint
 * @param column - The name column and the viewport it sits in
 */
export function paintStageNames(context: CanvasRenderingContext2D, column: NameColumn) {
  const { layout, lanes, top } = column;
  context.fillStyle = STAGE_PALETTE.nameColumn;
  context.fillRect(0, layout.band, layout.nameColumn, column.height - layout.band);
  context.fillStyle = STAGE_PALETTE.nameColumnEdge;
  context.fillRect(layout.nameColumn - 1, layout.band, 1, column.height - layout.band);
  const fontPx = nameFontPx(layout.laneHeight);
  context.textBaseline = "middle";
  for (let lane = lanes.first; lane <= lanes.last; lane += 1) {
    const key = column.laneOrder[lane];
    const centre = layout.band + (lane + 0.5) * layout.laneHeight - top;
    const isLeader = key === column.leaderKey;
    context.fillStyle = column.colors.get(key)!;
    context.fillRect(MARK_X, centre - MARK_SIZE / 2, MARK_SIZE, MARK_SIZE);
    context.font = bodyFont(fontPx, isLeader ? NAME_WEIGHT_LEADER : NAME_WEIGHT, column.fonts);
    context.textAlign = "left";
    context.fillStyle = isLeader ? STAGE_PALETTE.gold : STAGE_PALETTE.paper;
    context.fillText(column.fitted.get(key)!, NAME_X, centre);
    const place = column.places?.get(key);
    if (place === undefined) continue;
    context.font = bodyFont(RANK_FONT_PX, RANK_FONT_WEIGHT, column.fonts);
    context.textAlign = "right";
    context.fillStyle = place <= MEDAL_RANKS ? STAGE_PALETTE.gold : STAGE_PALETTE.paperDim;
    context.fillText(String(place), layout.nameColumn - RANK_RIGHT_PADDING, centre);
  }
}
