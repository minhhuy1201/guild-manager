/** The broadcast clock: wall time on a steady clock (`performance.now()`), in ms. */
export interface RaceClock {
  /** When "go" was announced; null before it */
  readonly startedAt: number | null;
  /** When the clock froze; null while it runs or has not started */
  readonly stoppedAt: number | null;
}

export const IDLE_CLOCK: RaceClock = { startedAt: null, stoppedAt: null };

const MS_PER_SECOND = 1000;
/** Digits before the unit: "05.3s" keeps the clock the same width through the race. */
const CLOCK_DIGITS = 4;

/**
 * Start the clock.
 * @param now - When "go" was announced
 * @returns A running clock
 */
export function startClock(now: number): RaceClock {
  return { startedAt: now, stoppedAt: null };
}

/**
 * Freeze the clock; a clock that never started or already stopped stays as it is.
 * @param clock - The clock
 * @param now - When the race ended
 * @returns The frozen clock
 */
export function stopClock(clock: RaceClock, now: number): RaceClock {
  if (clock.startedAt === null || clock.stoppedAt !== null) return clock;

  return { ...clock, stoppedAt: now };
}

/**
 * Whether the display has to keep ticking.
 * @param clock - The clock
 * @returns True between start and stop
 */
export function isClockRunning(clock: RaceClock): boolean {
  return clock.startedAt !== null && clock.stoppedAt === null;
}

/**
 * Seconds on the clock.
 * @param clock - The clock
 * @param now - The time to read a running clock at
 * @returns 0 before the start, the frozen value after the stop
 */
export function clockSeconds(clock: RaceClock, now: number): number {
  if (clock.startedAt === null) return 0;

  return Math.max(0, ((clock.stoppedAt ?? now) - clock.startedAt) / MS_PER_SECOND);
}

/**
 * The clock as text.
 * @param seconds - Seconds on the clock
 * @returns "05.3s"
 */
export function formatClock(seconds: number): string {
  return `${seconds.toFixed(1).padStart(CLOCK_DIGITS, "0")}s`;
}
