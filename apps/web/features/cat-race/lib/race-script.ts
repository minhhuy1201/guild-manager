/** The three stagings a race can play; chosen per round on the client. */
export type RaceScenario = "comeback" | "duel" | "photo";

export const RACE_SCENARIOS: readonly RaceScenario[] = ["comeback", "duel", "photo"];

/** Normalised race times the pace curve passes through; progress is `knot + offset` at each. */
const KNOTS: readonly number[] = [0, 0.12, 0.3, 0.5, 0.7, 0.85, 0.94, 1];
const LAST_KNOT = KNOTS.length - 1;

/**
 * Offsets from even pace per knot, per role. The last entry is the final progress minus 1; the
 * winner's is overridden to land exactly on the line.
 */
interface ScenarioRoles {
  /** Winner */
  readonly W: readonly number[];
  /** Runner-up */
  readonly R: readonly number[];
  /** Dark horse (comeback) or third contender (photo); absent in a duel */
  readonly X?: readonly number[];
}

const SCENARIO_ROLES: Record<RaceScenario, ScenarioRoles> = {
  comeback: {
    W: [0, -0.015, -0.04, -0.05, -0.02, 0.02, 0.012, 0],
    R: [0, 0, 0.01, 0.02, 0.055, 0.035, 0.009, -0.012],
    X: [0, 0.03, 0.05, 0.055, 0.045, 0.03, 0.005, -0.02],
  },
  duel: {
    W: [0, 0.02, 0.04, 0.03, 0.045, 0.03, 0.012, 0],
    R: [0, 0.025, 0.035, 0.045, 0.035, 0.04, 0.01, -0.012],
  },
  photo: {
    W: [0, 0.01, 0.02, 0.03, 0.03, 0.02, 0.006, 0],
    R: [0, 0.012, 0.025, 0.028, 0.033, 0.022, 0.007, -0.0025],
    X: [0, 0.005, 0.015, 0.025, 0.028, 0.018, 0.004, -0.008],
  },
};

/** Role offsets (not the final one) share one random scale per race: different rounds, same order of lead changes. */
const ROLE_SCALE: readonly [number, number] = [0.85, 1.15];
/** Cats right behind the dark horse that hang on to the leaders. */
const CHASER_COUNT = 3;
/** Final progress offset of a chaser and of the field, as a distance short of the line. */
const CHASER_SHORTFALL: readonly [number, number] = [0.012, 0.037];
const FIELD_SHORTFALL: readonly [number, number] = [0.035, 0.205];
/** The pack wanders with a damped random walk until `FIELD_BLEND_FROM`, then eases to its final gap. */
const FIELD_WALK_DAMPING = 0.6;
const FIELD_WALK_STEP = 0.9;
const FIELD_BLEND_FROM = 0.55;
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
  readonly scenario: RaceScenario;
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
 * Hermite smoothstep.
 * @param from - Edge where the result leaves 0
 * @param to - Edge where the result reaches 1
 * @param value - The input
 * @returns 0..1
 */
function smoothstep(from: number, to: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));

  return t * t * (3 - 2 * t);
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
 * Offsets of a cat that is not in the front: stays close to even pace and drifts to its final gap
 * late, so the pack hangs together until about 60% of the race.
 * @param isChaser - Whether it is one of the cats that hang on to the leaders
 * @param random - Source in `[0, 1)`
 * @returns One offset per knot, the last being the final progress minus 1
 */
function fieldOffsets(isChaser: boolean, random: () => number): number[] {
  const final = -between(isChaser ? CHASER_SHORTFALL : FIELD_SHORTFALL, random);
  let walk = 0;

  return KNOTS.map((knot, index) => {
    if (index === 0) return 0;
    if (index === LAST_KNOT) return final;
    walk = walk * FIELD_WALK_DAMPING + (random() * 2 - 1) * FIELD_WALK_STEP;
    const spread = 0.01 + 0.03 * knot;
    const cap = 0.012 + 0.018 * knot;
    const raw = cap * Math.tanh((walk * spread) / cap);
    const blend = smoothstep(FIELD_BLEND_FROM, 1, knot);

    return raw * (1 - blend) + final * blend;
  });
}

/**
 * Plan a whole race ahead of time: the winner is fixed, everything else is staging.
 * @param input.entrants - Who ran and how many tickets each holds
 * @param input.winner - The server's winning ticket
 * @param input.durationSeconds - Seconds the winner takes to cross the line
 * @param input.scenario - Staging to play; picked with `random` when omitted
 * @param input.random - Source in `[0, 1)`; seeded in tests
 * @returns The script the renderer replays
 */
export function buildRaceScript(input: {
  entrants: readonly { characterId: string; tickets: number }[];
  winner: { characterId: string; ticketNo: number };
  durationSeconds: number;
  scenario?: RaceScenario;
  random: () => number;
}): RaceScript {
  const { random, durationSeconds } = input;
  const scenario = input.scenario ?? RACE_SCENARIOS[Math.floor(random() * RACE_SCENARIOS.length)];
  const roles = SCENARIO_ROLES[scenario];
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
  const scale = between(ROLE_SCALE, random);
  const roleOf = new Map<string, readonly number[]>([[winnerKey, roles.W]]);
  if (others[0]) roleOf.set(others[0].key, roles.R);
  if (others[1] && roles.X) roleOf.set(others[1].key, roles.X);
  const chasers = new Set(others.slice(2, 2 + CHASER_COUNT).map((cat) => cat.key));

  const curves = new Map<string, PaceCurve>();
  for (const cat of cats) {
    const role = roleOf.get(cat.key);
    const offsets = role
      ? role.map((offset, index) => (index === LAST_KNOT ? offset : offset * scale))
      : fieldOffsets(chasers.has(cat.key), random);
    const raw = KNOTS.map((knot, index) => (index === 0 ? 0 : knot + offsets[index]));
    const stepped = raw.reduce<number[]>(
      (acc, value, index) => [...acc, index === 0 ? value : Math.max(value, acc[index - 1] + MIN_KNOT_STEP)],
      []
    );
    const final = cat.key === winnerKey ? 1 : Math.min(stepped[LAST_KNOT], MAX_LOSER_FINAL);
    curves.set(cat.key, monotoneCubic(KNOTS, [...stepped.slice(0, LAST_KNOT), final]));
  }

  const script = { durationSeconds, scenario, cats, curves, winnerKey, runnerUpGap: 1 };
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
