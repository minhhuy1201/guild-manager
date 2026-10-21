/** Lanterns lit one by one before the cats leave. */
export const COUNTDOWN_STEPS = 3;
export const COUNTDOWN_STEP_SECONDS = 0.8;
export const COUNTDOWN_SECONDS = COUNTDOWN_STEPS * COUNTDOWN_STEP_SECONDS;

/** Race time at which the winner is on the line. */
export const RACE_END_U = 1;

/** Race time from which the finish plays in slow motion. */
export const SLOW_FROM_U = 0.9;
/** Share of the winner's time after which the wall clock reaches `SLOW_FROM_U`: the last 10% of the track takes the last 26%. */
const SLOW_FROM_WALL = 0.74;
/** Race time from which the sprint is announced. */
export const SPRINT_FROM_U = 0.84;

/** Pause on the finished race before the result opens. */
export const FINISH_HOLD_SECONDS = 0.9;
/** Longer pause when the runner-up is this close to the line: the photo finish. */
export const PHOTO_HOLD_SECONDS = 2.6;
export const PHOTO_FINISH_GAP = 0.004;

/** Where a round is on the wall clock. */
export type RacePhase = "countdown" | "running" | "finish" | "photo" | "done";

export interface RaceMoment {
  readonly phase: RacePhase;
  /** Lantern step 0..2 while counting down, else null */
  readonly countdownStep: number | null;
  /** Race time 0..1 that positions the cats */
  readonly u: number;
  readonly isSprint: boolean;
  readonly isSlow: boolean;
}

/**
 * Race time for a share of the winner's duration: even pace up to `SLOW_FROM_U`, then about three
 * times slower, so the winner still touches the line exactly on the typed duration.
 * @param fraction - Wall time since the start over the duration
 * @returns Race time 0..1
 */
export function raceTimeAt(fraction: number): number {
  if (fraction <= 0) return 0;
  if (fraction < SLOW_FROM_WALL) return (fraction / SLOW_FROM_WALL) * SLOW_FROM_U;

  return Math.min(1, SLOW_FROM_U + ((fraction - SLOW_FROM_WALL) / (1 - SLOW_FROM_WALL)) * (1 - SLOW_FROM_U));
}

/**
 * Seconds the finished race stays before the result.
 * @param runnerUpGap - Share of the track the runner-up is short of the line
 * @returns The long photo-finish hold when it is that close, else the short one
 */
export function finishHoldSeconds(runnerUpGap: number): number {
  return runnerUpGap < PHOTO_FINISH_GAP ? PHOTO_HOLD_SECONDS : FINISH_HOLD_SECONDS;
}

/**
 * Seconds from the first lantern to the result.
 * @param durationSeconds - Seconds the winner takes
 * @param runnerUpGap - See `finishHoldSeconds`
 * @returns The total
 */
export function totalSeconds(durationSeconds: number, runnerUpGap: number): number {
  return COUNTDOWN_SECONDS + durationSeconds + finishHoldSeconds(runnerUpGap);
}

/**
 * Where a round stands on the wall clock.
 * @param elapsed - Seconds since the first lantern
 * @param durationSeconds - Seconds the winner takes after "go"
 * @param runnerUpGap - See `finishHoldSeconds`
 * @returns The phase, race time and the flags the overlay reads
 */
export function momentAt(elapsed: number, durationSeconds: number, runnerUpGap: number): RaceMoment {
  if (elapsed < COUNTDOWN_SECONDS) {
    const step = Math.floor(Math.max(0, elapsed) / COUNTDOWN_STEP_SECONDS);

    return { phase: "countdown", countdownStep: step, u: 0, isSprint: false, isSlow: false };
  }
  const raced = elapsed - COUNTDOWN_SECONDS;
  const fraction = raced / durationSeconds;
  const u = raceTimeAt(fraction);
  const isSprint = u >= SPRINT_FROM_U;
  if (u < RACE_END_U) {
    return { phase: "running", countdownStep: null, u, isSprint, isSlow: u >= SLOW_FROM_U };
  }
  const isPhoto = runnerUpGap < PHOTO_FINISH_GAP;
  const afterFinish = raced - durationSeconds;
  const base = { countdownStep: null, u, isSprint, isSlow: false };
  if (afterFinish >= finishHoldSeconds(runnerUpGap)) return { ...base, phase: "done" };

  return { ...base, phase: isPhoto ? "photo" : "finish" };
}
