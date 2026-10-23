import type { PaceCurve } from "./race-script";
import { LEG_FRAME_COUNT, type LegFrame } from "./sprite-rows";

/** Leg-clock ticks per second of the winner's time; slow motion slows it with the race time. */
const LEG_CLOCK_RATE = 9;
/** Each lane starts a little out of step so a field does not gallop in unison. */
const LANE_PHASE = 0.37;
/** Speed, in multiples of even pace, above which a cat leaves speed lines. */
export const SPEED_LINE_FROM = 1.12;
/** Half the window of race time the speed is measured over. */
const SPEED_PROBE = 0.006;
const BOB_DIVISOR = 14;

/**
 * The leg clock: it follows race time, so legs stop with the cats and slow down in slow motion.
 * @param u - Race time, 0..1
 * @param durationSeconds - The winner's time
 * @returns Ticks so far
 */
export function legClock(u: number, durationSeconds: number): number {
  return legClockAt(u * durationSeconds);
}

/**
 * The leg clock on wall time, for cats that trot outside a race (a lane shuffle).
 * @param seconds - Seconds on any running clock
 * @returns Ticks so far
 */
export function legClockAt(seconds: number): number {
  return seconds * LEG_CLOCK_RATE;
}

/**
 * Which running frame a cat shows.
 * @param clock - `legClock`
 * @param lane - The cat's lane, to put lanes out of step
 * @param isRunning - False before "go" and after the finish: the cat stands at frame 0
 * @returns The frame
 */
export function legFrame(clock: number, lane: number, isRunning: boolean): LegFrame {
  if (!isRunning) return 0;

  return (Math.floor(clock + lane * LANE_PHASE) % LEG_FRAME_COUNT) as LegFrame;
}

/**
 * How far the body is lifted on even frames while running.
 * @param frame - The cat's frame
 * @param catHeight - Height of the cat in px
 * @param isRunning - Whether the cats are running
 * @returns A y offset, zero or negative
 */
export function bobOffset(frame: LegFrame, catHeight: number, isRunning: boolean): number {
  if (!isRunning || frame % 2 !== 0) return 0;

  return -Math.max(1, catHeight / BOB_DIVISOR);
}

/**
 * A cat's instantaneous speed, 1 being the pace that takes the whole race.
 * @param curve - The cat's pace curve
 * @param u - Race time, 0..1
 * @returns Progress per unit of race time
 */
export function speedAt(curve: PaceCurve, u: number): number {
  const from = Math.max(0, u - SPEED_PROBE);
  const to = Math.min(1, u + SPEED_PROBE);

  return (curve(to) - curve(from)) / (SPEED_PROBE * 2);
}
