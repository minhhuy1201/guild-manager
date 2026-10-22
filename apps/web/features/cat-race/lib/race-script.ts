/** Normalised race times the pace curve passes through; progress is `knot + offset` at each. */
const KNOTS: readonly number[] = [0, 0.12, 0.3, 0.5, 0.7, 0.85, 0.94, 1];
const LAST_KNOT = KNOTS.length - 1;

/**
 * How far each knot has moved from the cat's random walk to its final gap. Zero up to the reveal
 * point (0.7), so every cat, the winner included, is on the same walk until then.
 */
const KNOT_BLEND: readonly number[] = [0, 0, 0, 0, 0, 0.5, 0.85, 1];
/** Half-width of the extra shake the winner and the contenders get per knot, so their order stays open. */
const CONTENDER_SHAKE: readonly number[] = [0, 0, 0, 0, 0, 0.02, 0.01, 0];
/** Contenders other than the winner: how many run the finish alongside it. */
const CONTENDER_COUNT: readonly [number, number] = [2, 4];
/** Share of the track the runner-up is short of the line; skewed to the small end with a squared draw. */
const RUNNER_UP_SHORTFALL: readonly [number, number] = [0.001, 0.02];
/** Extra shortfall of each further contender over the one in front. */
const CONTENDER_STEP: readonly [number, number] = [0.001, 0.004];
/** Final shortfall of the rest of the field. */
const FIELD_SHORTFALL: readonly [number, number] = [0.035, 0.205];
/** The pack wanders with a damped random walk. */
const FIELD_WALK_DAMPING = 0.6;
const FIELD_WALK_STEP = 0.9;
/** Fritsch-Carlson bound on a tangent pair's squared ratio to the segment slope (3 squared). */
const TANGENT_LIMIT = 9;
/** Every knot must clear the previous one by this much. */
const MIN_KNOT_STEP = 0.01;
/** Greatest final progress of any cat but the winner, so none is on the line when the winner is. */
const MAX_LOSER_FINAL = 0.9985;

export interface RaceCat {
  readonly key: string;
  readonly characterId: string;
  readonly ticketNo: number;
}

/** A cat's progress along the track (0..1) at race time `u` (0..1). */
export type PaceCurve = (u: number) => number;

export interface RaceScript {
  readonly durationSeconds: number;
  readonly cats: readonly RaceCat[];
  readonly curves: ReadonlyMap<string, PaceCurve>;
  readonly winnerKey: string;
  /** Share of the track the runner-up is short of the line at the finish; 1 when nobody else ran */
  readonly runnerUpGap: number;
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
export function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }

  return copy;
}

/**
 * Fritsch-Carlson monotone cubic through the points: a rising set of values never dips between
 * knots, so a cat never runs backwards.
 * @param xs - Strictly increasing knots, first 0 and last 1
 * @param ys - Value at each knot
 * @returns The curve; 0 at or before the first knot, the last value at or after the last
 */
function monotoneCubic(xs: readonly number[], ys: readonly number[]): PaceCurve {
  const last = xs.length - 1;
  const slopes = xs.slice(0, last).map((x, i) => (ys[i + 1] - ys[i]) / (xs[i + 1] - x));
  const tangents = xs.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === last) return slopes[last - 1];

    return slopes[i - 1] * slopes[i] <= 0 ? 0 : (slopes[i - 1] + slopes[i]) / 2;
  });
  for (let i = 0; i < last; i += 1) {
    const a = tangents[i] / slopes[i];
    const b = tangents[i + 1] / slopes[i];
    const sum = a * a + b * b;
    if (sum <= TANGENT_LIMIT) continue;
    const shrink = Math.sqrt(TANGENT_LIMIT / sum);
    tangents[i] = shrink * a * slopes[i];
    tangents[i + 1] = shrink * b * slopes[i];
  }

  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return ys[last];
    let i = 0;
    while (x > xs[i + 1]) i += 1;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;

    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] +
      (t3 - 2 * t2 + t) * h * tangents[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] +
      (t3 - t2) * h * tangents[i + 1]
    );
  };
}

/**
 * The random walk every cat starts from, whatever its place in the result: it stays close to even
 * pace, so the pack hangs together.
 * @param random - Source in `[0, 1)`
 * @returns One offset per knot, 0 at the start
 */
function packWalk(random: () => number): number[] {
  let walk = 0;

  return KNOTS.map((knot, index) => {
    if (index === 0) return 0;
    walk = walk * FIELD_WALK_DAMPING + (random() * 2 - 1) * FIELD_WALK_STEP;
    const spread = 0.01 + 0.03 * knot;
    const cap = 0.012 + 0.018 * knot;

    return cap * Math.tanh((walk * spread) / cap);
  });
}

/**
 * Pull a walk toward the cat's final gap after the reveal point.
 * @param walk - The cat's random walk
 * @param shortfall - Share of the track it ends short of the line
 * @param shake - Source of the contender shake, or null for a cat outside the finish
 * @returns One offset per knot, the last being the final progress minus 1
 */
function settle(walk: readonly number[], shortfall: number, shake: (() => number) | null): number[] {
  return walk.map((raw, index) => {
    const blend = KNOT_BLEND[index];
    const pulled = raw * (1 - blend) - shortfall * blend;

    return shake ? pulled + CONTENDER_SHAKE[index] * (shake() * 2 - 1) : pulled;
  });
}

/**
 * Final shortfall of the winner and each contender, front to back; the winner's is 0.
 * @param count - How many contenders run with the winner
 * @param random - Source in `[0, 1)`
 * @returns One shortfall per contender, starting with the runner-up's
 */
function contenderShortfalls(count: number, random: () => number): number[] {
  const ratio = random();
  const [low, high] = RUNNER_UP_SHORTFALL;

  return Array.from({ length: count }).reduce<number[]>(
    (gaps, _, index) => [...gaps, index === 0 ? low + (high - low) * ratio * ratio : gaps[index - 1] + between(CONTENDER_STEP, random)],
    []
  );
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
  const wanted = CONTENDER_COUNT[0] + Math.floor(random() * (CONTENDER_COUNT[1] - CONTENDER_COUNT[0] + 1));
  const shortfalls = contenderShortfalls(Math.min(wanted, others.length), random);
  const shortfallOf = new Map<string, number>([[winnerKey, 0]]);
  shortfalls.forEach((gap, index) => shortfallOf.set(others[index].key, gap));

  const curves = new Map<string, PaceCurve>();
  for (const cat of cats) {
    const walk = packWalk(random);
    const contenderShortfall = shortfallOf.get(cat.key);
    const offsets =
      contenderShortfall === undefined
        ? settle(walk, between(FIELD_SHORTFALL, random), null)
        : settle(walk, contenderShortfall, random);
    const raw = KNOTS.map((knot, index) => (index === 0 ? 0 : knot + offsets[index]));
    const stepped = raw.reduce<number[]>(
      (acc, value, index) => [...acc, index === 0 ? value : Math.max(value, acc[index - 1] + MIN_KNOT_STEP)],
      []
    );
    const final = cat.key === winnerKey ? 1 : Math.min(stepped[LAST_KNOT], MAX_LOSER_FINAL);
    curves.set(cat.key, monotoneCubic(KNOTS, [...stepped.slice(0, LAST_KNOT), final]));
  }

  const script = { durationSeconds, cats, curves, winnerKey, runnerUpGap: 1 };
  const [, runnerUp] = rankAt(script, 1);

  return { ...script, runnerUpGap: runnerUp ? 1 - curves.get(runnerUp)!(1) : 1 };
}

/**
 * How far along the track a cat is.
 * @param curve - The cat's pace curve
 * @param u - Race time, 0..1
 * @returns 0..1; never decreases with `u`, the winner is exactly 1 at `u = 1`
 */
export function progressAt(curve: PaceCurve, u: number): number {
  return curve(Math.min(1, Math.max(0, u)));
}

/**
 * Cats ranked front to back at one moment. The one ranking behind the track, the board and the
 * photo finish.
 * @param script - The race
 * @param u - Race time, 0..1; later moments rank as `u = 1`
 * @returns Keys, leader first; equal progress goes to the key
 */
export function rankAt(
  script: Pick<RaceScript, "cats" | "curves">,
  u: number
): string[] {
  return script.cats
    .map((cat) => ({ key: cat.key, progress: progressAt(script.curves.get(cat.key)!, u) }))
    .sort((a, b) => b.progress - a.progress || a.key.localeCompare(b.key))
    .map((entry) => entry.key);
}

/**
 * Key of the cat in front at one moment; the same cat `rankAt` puts first, without sorting the field.
 * @param script - The race
 * @param u - Race time, 0..1
 * @returns The leader's key
 */
export function leaderAt(script: Pick<RaceScript, "cats" | "curves">, u: number): string {
  let leader = script.cats[0].key;
  let best = progressAt(script.curves.get(leader)!, u);
  for (const { key } of script.cats) {
    const progress = progressAt(script.curves.get(key)!, u);
    if (progress > best || (progress === best && key.localeCompare(leader) < 0)) {
      leader = key;
      best = progress;
    }
  }

  return leader;
}
