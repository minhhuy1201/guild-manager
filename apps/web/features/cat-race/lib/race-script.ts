/** Pause on the finished race before the result opens. */
export const FINISH_HOLD_SECONDS = 0.8;

/** Cats that stay within a whisker of the winner, besides the runner-up. */
const CHASER_COUNT = 3;

/**
 * Finish time as a multiple of the winner's, per role. Every range starts above 1, so at the
 * winner's finish no other cat has crossed the line (see `progressAt`); the field spreads wide so
 * the pack visibly stretches out.
 */
const RUNNER_UP_FINISH: readonly [number, number] = [1.004, 1.012];
const CHASER_FINISH: readonly [number, number] = [1.015, 1.07];
const FIELD_FINISH: readonly [number, number] = [1.07, 1.6];

/**
 * Wobble limits: progress stays monotonic while `wobble * (2π * cycles + 4) < 1`, and these
 * ceilings keep that product near 0.04 * 16.6 = 0.66. The wobble also lifts progress by at most
 * `4 * wobble * s * (1 - s)`, so a cat finishing at `1.004 * duration` is still at about 0.9966 of the
 * track when the winner crosses.
 */
const MAX_WOBBLE = 0.04;
const MAX_CYCLES = 2;

export interface RaceCat {
  readonly key: string;
  readonly characterId: string;
  readonly ticketNo: number;
}

export interface CatMotion {
  readonly finishAt: number;
  readonly wobble: number;
  readonly cycles: number;
  readonly phase: number;
}

export interface RaceScript {
  readonly durationSeconds: number;
  readonly cats: readonly RaceCat[];
  readonly motions: ReadonlyMap<string, CatMotion>;
  readonly winnerKey: string;
  /** Seconds after the start when the race stops: the winner's finish plus the hold. */
  readonly endSeconds: number;
}

/**
 * Key of one cat: a person's n-th ticket.
 * @param characterId - Owner
 * @param ticketNo - 1-based ticket number among the owner's tickets
 * @returns The key
 */
export function catKey(characterId: string, ticketNo: number): string {
  return `${characterId}#${ticketNo}`;
}

/**
 * A number in `[min, max)`.
 * @param range - Lower and upper bound
 * @param random - Source in `[0, 1)`
 * @returns The number
 */
function between(range: readonly [number, number], random: () => number): number {
  return range[0] + (range[1] - range[0]) * random();
}

/**
 * Shuffle without touching the input (Fisher-Yates).
 * @param items - Items to shuffle
 * @param random - Source in `[0, 1)`
 * @returns A shuffled copy
 */
function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }

  return copy;
}

/**
 * Plan a whole race ahead of time: the winner is fixed, everything else is staging.
 * @param input.entrants - Who ran and how many tickets each holds
 * @param input.winner - The server's winning ticket
 * @param input.durationSeconds - Seconds the winner takes to cross the line
 * @param input.random - Source in `[0, 1)`; seeded in tests
 * @returns The script the renderer replays
 */
export function buildRaceScript(input: {
  entrants: readonly { characterId: string; tickets: number }[];
  winner: { characterId: string; ticketNo: number };
  durationSeconds: number;
  random: () => number;
}): RaceScript {
  const { random, durationSeconds } = input;
  const cats = input.entrants.flatMap(({ characterId, tickets }) =>
    Array.from({ length: tickets }, (_, index) => ({
      key: catKey(characterId, index + 1),
      characterId,
      ticketNo: index + 1,
    }))
  );
  const winnerKey = catKey(input.winner.characterId, input.winner.ticketNo);
  const others = shuffled(
    cats.filter((cat) => cat.key !== winnerKey),
    random
  );

  const motion = (finishAt: number): CatMotion => ({
    finishAt,
    wobble: random() * MAX_WOBBLE,
    cycles: 1 + random() * (MAX_CYCLES - 1),
    phase: random() * 2 * Math.PI,
  });
  const motions = new Map<string, CatMotion>([[winnerKey, motion(durationSeconds)]]);
  others.forEach((cat, index) => {
    const range =
      index === 0 ? RUNNER_UP_FINISH : index <= CHASER_COUNT ? CHASER_FINISH : FIELD_FINISH;
    motions.set(cat.key, motion(durationSeconds * between(range, random)));
  });

  return {
    durationSeconds,
    cats,
    motions,
    winnerKey,
    endSeconds: durationSeconds + FINISH_HOLD_SECONDS,
  };
}

/**
 * How far along the track a cat is.
 * @param motion - The cat's motion
 * @param seconds - Time since the start
 * @returns 0..1; never decreases with time, exactly 1 from `finishAt` on
 */
export function progressAt(motion: CatMotion, seconds: number): number {
  if (seconds <= 0) return 0;
  const s = Math.min(1, seconds / motion.finishAt);

  return (
    s +
    motion.wobble *
      Math.sin(2 * Math.PI * motion.cycles * s + motion.phase) *
      4 *
      s *
      (1 - s)
  );
}

/**
 * Cats ranked front to back at one moment. The race stops when the winner crosses, so later
 * moments rank the same as that one.
 * @param script - The race
 * @param seconds - Time since the start
 * @returns Keys, leader first; ties go to the earlier finisher, then to the key
 */
export function rankAt(script: RaceScript, seconds: number): string[] {
  const moment = Math.min(seconds, script.durationSeconds);

  return script.cats
    .map((cat) => {
      const motion = script.motions.get(cat.key)!;

      return {
        key: cat.key,
        progress: progressAt(motion, moment),
        finishAt: motion.finishAt,
      };
    })
    // Cats already on the line tie at 1: the earlier finisher leads, so the board agrees with the
    // winner. The key only keeps the order stable.
    .sort(
      (a, b) =>
        b.progress - a.progress ||
        a.finishAt - b.finishAt ||
        a.key.localeCompare(b.key)
    )
    .map((entry) => entry.key);
}
