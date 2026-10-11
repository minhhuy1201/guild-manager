export type RaceSpeed = "FAST" | "NORMAL" | "SLOW";

/** How long the winner takes to cross the line, per speed setting. */
export const RACE_DURATION_SECONDS: Record<RaceSpeed, number> = {
  FAST: 6,
  NORMAL: 12,
  SLOW: 20,
};

/** Cats that reach the sprint; a smaller field skips the elimination and sprints at once. */
export const FINALIST_COUNT = 8;
/** Share of the race at which the back half of the field fades out. */
export const FIRST_CHECKPOINT = 0.4;
/** Share of the race at which only the finalists are left. */
export const SECOND_CHECKPOINT = 0.7;

/**
 * Finish time as a multiple of the winner's, per role. Chosen so that at `SECOND_CHECKPOINT` every
 * finalist is ahead of every cut cat (finalists >= 0.614 of the track, the rest <= 0.60) whatever
 * the wobble draws.
 */
const RUNNER_UP_FINISH: readonly [number, number] = [1.004, 1.012];
const FINALIST_FINISH: readonly [number, number] = [1.015, 1.07];
const CUT_FINISH: readonly [number, number] = [1.25, 1.9];

/**
 * Wobble limits: progress stays monotonic while `wobble * (2π * cycles + 4) < 1`, and these
 * ceilings keep that product near 0.04 * 16.6 = 0.66.
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
  readonly finalistKeys: ReadonlySet<string>;
  /** False when the field is FINALIST_COUNT or smaller: straight to the sprint. */
  readonly eliminates: boolean;
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
 * @param input.speed - Chosen speed
 * @param input.random - Source in `[0, 1)`; seeded in tests
 * @returns The script the renderer replays
 */
export function buildRaceScript(input: {
  entrants: readonly { characterId: string; tickets: number }[];
  winner: { characterId: string; ticketNo: number };
  speed: RaceSpeed;
  random: () => number;
}): RaceScript {
  const { random } = input;
  const durationSeconds = RACE_DURATION_SECONDS[input.speed];
  const cats = input.entrants.flatMap(({ characterId, tickets }) =>
    Array.from({ length: tickets }, (_, index) => ({
      key: catKey(characterId, index + 1),
      characterId,
      ticketNo: index + 1,
    }))
  );
  const winnerKey = catKey(input.winner.characterId, input.winner.ticketNo);
  const eliminates = cats.length > FINALIST_COUNT;
  const others = shuffled(
    cats.filter((cat) => cat.key !== winnerKey),
    random
  );
  const finalists = eliminates ? others.slice(0, FINALIST_COUNT - 1) : others;
  const finalistKeys = new Set([winnerKey, ...finalists.map((cat) => cat.key)]);

  const motions = new Map<string, CatMotion>();
  const motion = (finishAt: number): CatMotion => ({
    finishAt,
    wobble: random() * MAX_WOBBLE,
    cycles: 1 + random() * (MAX_CYCLES - 1),
    phase: random() * 2 * Math.PI,
  });
  motions.set(winnerKey, motion(durationSeconds));
  others.forEach((cat, index) => {
    const range = !finalistKeys.has(cat.key)
      ? CUT_FINISH
      : index === 0
        ? RUNNER_UP_FINISH
        : FINALIST_FINISH;
    motions.set(cat.key, motion(durationSeconds * between(range, random)));
  });

  return { durationSeconds, cats, motions, winnerKey, finalistKeys, eliminates };
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
 * Cats ranked front to back at one moment.
 * @param script - The race
 * @param seconds - Time since the start
 * @returns Keys, leader first; ties go to the earlier finisher, then to the key
 */
export function rankAt(script: RaceScript, seconds: number): string[] {
  return script.cats
    .map((cat) => {
      const motion = script.motions.get(cat.key)!;

      return {
        key: cat.key,
        progress: progressAt(motion, seconds),
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

/**
 * Keys cut at the first checkpoint: non-finalists in the back half of the field at that moment.
 * @param script - The race
 * @returns The keys that fade out first; empty when the race has no elimination
 */
export function cutAtFirstCheckpoint(script: RaceScript): ReadonlySet<string> {
  if (!script.eliminates) return new Set();
  const ranking = rankAt(script, FIRST_CHECKPOINT * script.durationSeconds);
  const firstBackIndex = Math.ceil(ranking.length / 2);

  return new Set(
    ranking
      .slice(firstBackIndex)
      .filter((key) => !script.finalistKeys.has(key))
  );
}
