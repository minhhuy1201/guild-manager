/** How long the cats take to trot to their new lanes after a shuffle. */
export const LANE_SHUFFLE_MS = 600;

/** The cats trotting from one lane order to another. Lanes are counted from the top, in lane units. */
export interface LaneShuffle {
  /** Where each cat set off; between two lanes when this shuffle cut another one short */
  readonly from: ReadonlyMap<string, number>;
  readonly to: ReadonlyMap<string, number>;
  /** Timestamp in ms, on the `requestAnimationFrame` clock */
  readonly startedAt: number;
}

/**
 * Speed up out of the old lane and settle into the new one.
 * @param t - Linear progress, 0..1
 * @returns Eased progress, 0..1
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * How far a shuffle has got.
 * @param shuffle - The shuffle
 * @param now - Timestamp in ms
 * @returns Eased progress, 0 at the start and 1 once every cat has arrived
 */
function progressOf(shuffle: LaneShuffle, now: number): number {
  const t = Math.min(1, Math.max(0, (now - shuffle.startedAt) / LANE_SHUFFLE_MS));

  return easeInOutCubic(t);
}

/**
 * Whether the cats are still on their way.
 * @param shuffle - The shuffle, or null when none ran
 * @param now - Timestamp in ms
 * @returns True until the last frame of the move
 */
export function isShuffling(shuffle: LaneShuffle | null, now: number): boolean {
  return shuffle !== null && now - shuffle.startedAt < LANE_SHUFFLE_MS;
}

/**
 * Where every cat is at one moment of a shuffle.
 * @param shuffle - The shuffle
 * @param now - Timestamp in ms
 * @returns Lane by cat key, fractional while a cat is between lanes; a cat that joined late is
 * already in its new lane
 */
export function lanesAt(shuffle: LaneShuffle, now: number): Map<string, number> {
  const progress = progressOf(shuffle, now);

  return new Map(
    [...shuffle.to].map(([key, to]) => {
      const from = shuffle.from.get(key) ?? to;

      return [key, from + (to - from) * progress];
    })
  );
}

/**
 * Whether one cat is trotting right now, so it shows its running legs.
 * @param shuffle - The shuffle, or null when none ran
 * @param key - The cat
 * @param now - Timestamp in ms
 * @returns False for a cat the shuffle left in its lane
 */
export function isTrotting(shuffle: LaneShuffle | null, key: string, now: number): boolean {
  if (!shuffle || !isShuffling(shuffle, now)) return false;
  const from = shuffle.from.get(key);

  return from !== undefined && from !== shuffle.to.get(key);
}
