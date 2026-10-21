import { describe, expect, it } from "vitest";

import {
  RACE_SCENARIOS,
  buildRaceScript,
  catKey,
  leaderAt,
  progressAt,
  rankAt,
  type PaceCurve,
  type RaceScenario,
} from "../race-script";
import { PHOTO_FINISH_GAP } from "../race-timeline";

/**
 * A small seeded PRNG (mulberry32) so a failing case replays.
 * @param seed - Seed
 * @returns A source in `[0, 1)`
 */
function seeded(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A field of `people` entrants with the same number of tickets each.
 * @param people - How many entrants
 * @param tickets - Tickets each
 * @returns The entrants
 */
function field(people: number, tickets: number) {
  return Array.from({ length: people }, (_, index) => ({
    characterId: `c${index}`,
    tickets,
  }));
}

/**
 * A script for a field, the winner being the first ticket of `c0`.
 * @param people - How many entrants
 * @param tickets - Tickets each
 * @param durationSeconds - Seconds the winner takes
 * @param seed - PRNG seed
 * @param scenario - Staging to force; picked from the seed when omitted
 * @returns The script
 */
function scriptFor(
  people: number,
  tickets: number,
  durationSeconds = 12,
  seed = 7,
  scenario?: RaceScenario
) {
  return buildRaceScript({
    entrants: field(people, tickets),
    winner: { characterId: "c0", ticketNo: tickets },
    durationSeconds,
    scenario,
    random: seeded(seed),
  });
}

/** Fields the script is checked against: a duel, a small, a normal and the largest field. */
const FIELD_SIZES = [2, 8, 30, 240];
const SEEDS = Array.from({ length: 12 }, (_, index) => index + 1);
/** Race-time step when walking a script; fine enough to see every lead change. */
const SAMPLE_STEP = 0.002;
const MONOTONE_STEP = 0.01;

/**
 * How often the lead changes after the start, counting the same way the stage does.
 * @param script - The race
 * @returns Lead changes between `u = 0.08` and the finish
 */
function leadChanges(script: ReturnType<typeof scriptFor>): number {
  let leader: string | null = null;
  let changes = 0;
  for (let u = 0; u <= 1 + SAMPLE_STEP; u += SAMPLE_STEP) {
    const [front] = rankAt(script, u);
    if (front !== leader && leader !== null && u > 0.08) changes += 1;
    leader = front;
  }

  return changes;
}

/**
 * The largest step backwards a pace curve takes, 0 when it never does.
 * @param curve - A cat's pace curve
 * @returns The drop in progress
 */
function steepestDrop(curve: PaceCurve): number {
  let drop = 0;
  let last = 0;
  for (let u = 0; u <= 1; u += MONOTONE_STEP) {
    const now = progressAt(curve, u);
    drop = Math.max(drop, last - now);
    last = now;
  }

  return drop;
}

/** Fewest lead changes each staging must produce, measured over many seeds and field sizes. */
const MIN_LEAD_CHANGES: Record<RaceScenario, number> = { comeback: 1, duel: 3, photo: 2 };

describe("buildRaceScript", () => {
  it("makes the winner cross exactly at u = 1, ahead of everyone, in every staging", () => {
    for (const scenario of RACE_SCENARIOS) {
      for (const people of FIELD_SIZES) {
        for (const seed of SEEDS) {
          const script = scriptFor(people, 1, 12, seed, scenario);

          expect(script.winnerKey).toBe(catKey("c0", 1));
          expect(progressAt(script.curves.get(script.winnerKey)!, 1)).toBe(1);
          expect(rankAt(script, 1)[0]).toBe(script.winnerKey);
          for (const cat of script.cats) {
            if (cat.key === script.winnerKey) continue;
            expect(progressAt(script.curves.get(cat.key)!, 1)).toBeLessThan(1);
          }
        }
      }
    }
  });

  it("starts every cat at 0 and never moves one backwards", () => {
    for (const scenario of RACE_SCENARIOS) {
      for (const people of FIELD_SIZES) {
        for (const seed of SEEDS) {
          const script = scriptFor(people, 1, 12, seed, scenario);

          for (const curve of script.curves.values()) {
            expect(progressAt(curve, 0)).toBe(0);
            expect(steepestDrop(curve)).toBeLessThanOrEqual(1e-12);
          }
        }
      }
    }
  });

  it("keeps the winner's pace curve at 1 beyond the end", () => {
    const script = scriptFor(8, 1);

    expect(progressAt(script.curves.get(script.winnerKey)!, 3)).toBe(1);
    expect(progressAt(script.curves.get(script.winnerKey)!, -1)).toBe(0);
  });

  it.each(RACE_SCENARIOS)("changes the lead often enough in a %s", (scenario) => {
    for (const people of FIELD_SIZES) {
      for (const seed of SEEDS) {
        const script = scriptFor(people, 1, 12, seed, scenario);

        expect(leadChanges(script)).toBeGreaterThanOrEqual(MIN_LEAD_CHANGES[scenario]);
      }
    }
  });

  it("ends a photo finish inside the photo gap and the other stagings outside it", () => {
    for (const people of FIELD_SIZES) {
      for (const seed of SEEDS) {
        expect(scriptFor(people, 1, 12, seed, "photo").runnerUpGap).toBeLessThan(PHOTO_FINISH_GAP);
        expect(scriptFor(people, 1, 12, seed, "comeback").runnerUpGap).toBeGreaterThan(PHOTO_FINISH_GAP);
        expect(scriptFor(people, 1, 12, seed, "duel").runnerUpGap).toBeGreaterThan(PHOTO_FINISH_GAP);
      }
    }
  });

  it("picks the staging with the injected random when none is given, and every staging comes up", () => {
    const picked = new Set(SEEDS.map((seed) => scriptFor(8, 1, 12, seed).scenario));

    expect(picked).toEqual(new Set(RACE_SCENARIOS));
    expect(scriptFor(8, 1, 12, 3).scenario).toBe(scriptFor(8, 1, 12, 3).scenario);
  });

  it("keeps the pack close to the winner at the halfway mark", () => {
    const script = scriptFor(80, 3, 12, 4, "duel");
    const progress = script.cats.map((cat) => progressAt(script.curves.get(cat.key)!, 0.5));

    expect(Math.max(...progress) - Math.min(...progress)).toBeLessThan(0.12);
  });

  it("does not touch the entrants it was given", () => {
    const entrants = field(4, 2);
    const copy = structuredClone(entrants);
    buildRaceScript({
      entrants,
      winner: { characterId: "c0", ticketNo: 1 },
      durationSeconds: 12,
      random: seeded(1),
    });

    expect(entrants).toEqual(copy);
  });

  it("ranks every cat once", () => {
    const script = scriptFor(80, 3);

    expect(new Set(rankAt(script, 0.5)).size).toBe(240);
  });

  it("has one cat per person in standard mode", () => {
    expect(scriptFor(30, 1).cats).toHaveLength(30);
  });

  it("races a field of two", () => {
    const script = scriptFor(2, 1);

    expect(rankAt(script, 1)).toEqual([script.winnerKey, catKey("c1", 1)]);
  });

  it("has no runner-up gap to speak of when one cat races alone", () => {
    const script = scriptFor(1, 1);

    expect(rankAt(script, 1)).toEqual([script.winnerKey]);
    expect(script.runnerUpGap).toBe(1);
  });
});

describe("leaderAt", () => {
  it("names the cat rankAt puts first, for every scenario and moment", () => {
    for (const scenario of RACE_SCENARIOS) {
      const script = buildRaceScript({
        entrants: Array.from({ length: 30 }, (_, index) => ({ characterId: `c${index}`, tickets: 1 })),
        winner: { characterId: "c7", ticketNo: 1 },
        durationSeconds: 20,
        scenario,
        random: seeded(11),
      });
      for (let u = 0; u <= 1; u += 0.05) {
        expect(leaderAt(script, u)).toBe(rankAt(script, u)[0]);
      }
    }
  });
});
