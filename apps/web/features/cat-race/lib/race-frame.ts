import {
  FULL_VIEW,
  catSize,
  finishAlong,
  fromPoint,
  laneSlots,
  packSlots,
  projectProgress,
  startAlong,
  toPoint,
  type Area,
  type Point,
  type RaceOrientation,
} from "./race-layout";
import {
  FIRST_CHECKPOINT,
  FINALIST_COUNT,
  SECOND_CHECKPOINT,
  cutAtFirstCheckpoint,
  progressAt,
  rankAt,
  type RaceScript,
} from "./race-script";

/** How long a cut cat takes to fade, and the finalists take to settle into lanes. */
export const FADE_SECONDS = 0.6;
export const LANE_SECONDS = 0.8;
/** Pause on the finished race before the result opens. */
export const FINISH_HOLD_SECONDS = 0.8;
/** Share of the track hidden by the camera once it has zoomed to the sprint. */
const ZOOM_FROM = 0.55;
/** Leaders listed on the live board. */
export const LEADER_COUNT = 5;
/** Cats at or below this count always carry a name. */
const ALWAYS_LABELLED = 20;
/** Cats that carry a name before the sprint. */
const EARLY_LABELS = 3;

/** One cat as the renderer paints it. */
export interface FrameCat {
  readonly key: string;
  readonly point: Point;
  readonly alpha: number;
  readonly size: number;
  readonly labelled: boolean;
}

/** Everything a frame needs that does not change while the race runs. */
export interface RacePlan {
  readonly script: RaceScript;
  readonly area: Area;
  readonly orientation: RaceOrientation;
  readonly pack: ReadonlyMap<string, Point>;
  readonly lanes: ReadonlyMap<string, Point>;
  readonly cut: ReadonlySet<string>;
  readonly packSize: number;
  readonly laneSize: number;
  /** Seconds after the start when the last finalist has crossed, plus the hold. */
  readonly endSeconds: number;
}

/**
 * Smooth start and end for a 0..1 ramp.
 * @param value - Ramp position, clamped to 0..1
 * @returns Eased value
 */
function ease(value: number): number {
  const t = Math.min(1, Math.max(0, value));

  return t * t * (3 - 2 * t);
}

/**
 * @param from - Start value
 * @param to - End value
 * @param amount - 0..1
 * @returns The value between them
 */
function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

/**
 * Work out everything fixed about a race for one canvas size.
 * @param script - The race
 * @param area - Canvas size
 * @param orientation - Track direction
 * @returns The plan the frames read
 */
export function planRace(
  script: RaceScript,
  area: Area,
  orientation: RaceOrientation
): RacePlan {
  const keys = script.cats.map((cat) => cat.key);
  const finalistsByRank = rankAt(
    script,
    SECOND_CHECKPOINT * script.durationSeconds
  ).filter((key) => script.finalistKeys.has(key));
  const lastFinish = Math.max(
    ...[...script.finalistKeys].map((key) => script.motions.get(key)!.finishAt)
  );

  return {
    script,
    area,
    orientation,
    pack: packSlots(keys, area, orientation),
    lanes: laneSlots(
      script.eliminates ? finalistsByRank : keys,
      area,
      orientation
    ),
    cut: cutAtFirstCheckpoint(script),
    packSize: catSize(keys.length, area, orientation),
    laneSize: catSize(FINALIST_COUNT, area, orientation),
    endSeconds: lastFinish + FINISH_HOLD_SECONDS,
  };
}

/**
 * Position of every cat at one moment.
 * @param plan - The race plan
 * @param seconds - Time since the start
 * @returns The cats still on screen, back to front
 */
export function frameAt(plan: RacePlan, seconds: number): FrameCat[] {
  const { script, area, orientation } = plan;
  const duration = script.durationSeconds;
  const firstAt = FIRST_CHECKPOINT * duration;
  const secondAt = SECOND_CHECKPOINT * duration;
  const sprint = script.eliminates ? ease((seconds - secondAt) / LANE_SECONDS) : 1;
  const view = {
    from: lerp(FULL_VIEW.from, script.eliminates ? ZOOM_FROM : 0, sprint),
    to: FULL_VIEW.to,
  };
  const earlyLeaders = new Set(
    script.eliminates && seconds < secondAt
      ? rankAt(script, seconds).slice(0, EARLY_LABELS)
      : []
  );

  return script.cats.flatMap((cat) => {
    const progress = progressAt(script.motions.get(cat.key)!, seconds);
    const isFinalist = script.finalistKeys.has(cat.key);
    const alpha = !script.eliminates || isFinalist
      ? 1
      : plan.cut.has(cat.key)
        ? 1 - ease((seconds - firstAt) / FADE_SECONDS)
        : 1 - ease((seconds - secondAt) / FADE_SECONDS);
    if (alpha <= 0) return [];

    const slot = plan.pack.get(cat.key)!;
    const slotAlong = fromPoint(slot, orientation);
    const packed = toPoint(
      lerp(slotAlong.along, finishAlong(area, orientation), progress),
      slotAlong.across,
      orientation
    );
    const lane = plan.lanes.get(cat.key);
    const point =
      lane && sprint > 0
        ? mixPoints(
            packed,
            projectProgress(
              progress,
              fromPoint(lane, orientation).across,
              view,
              area,
              orientation
            ),
            sprint
          )
        : packed;
    const size = lane ? lerp(plan.packSize, plan.laneSize, sprint) : plan.packSize;

    return [
      {
        key: cat.key,
        point,
        alpha,
        size,
        labelled:
          script.cats.length <= ALWAYS_LABELLED ||
          (isFinalist && sprint >= 1) ||
          earlyLeaders.has(cat.key),
      },
    ];
  });
}

/**
 * @param from - Start point
 * @param to - End point
 * @param amount - 0..1
 * @returns The point between them
 */
function mixPoints(from: Point, to: Point, amount: number): Point {
  return { x: lerp(from.x, to.x, amount), y: lerp(from.y, to.y, amount) };
}

/**
 * Leaders at one moment, for the live board.
 * @param script - The race
 * @param seconds - Time since the start
 * @returns The top keys, leader first; after the second checkpoint only finalists count
 */
export function leadersAt(script: RaceScript, seconds: number): string[] {
  const ranking = rankAt(script, seconds);
  const inRace =
    script.eliminates && seconds >= SECOND_CHECKPOINT * script.durationSeconds
      ? ranking.filter((key) => script.finalistKeys.has(key))
      : ranking;

  return inRace.slice(0, LEADER_COUNT);
}

/**
 * Where the start line sits, for drawing the line itself.
 * @param plan - The race plan
 * @returns Start and finish along coordinates
 */
export function trackLines(plan: RacePlan) {
  return {
    start: startAlong(plan.area, plan.orientation),
    finish: finishAlong(plan.area, plan.orientation),
  };
}
