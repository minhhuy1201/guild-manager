import { describe, expect, it } from "vitest";

import {
  buildRaceScript,
  catKey,
  leaderAt,
  progressAt,
  rankAt,
  type PaceCurve,
} from "../race-script";
import { seededRandom } from "./seeded-random";

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
 * @returns The script
 */
function scriptFor(people: number, tickets: number, durationSeconds = 12, seed = 7) {
  return buildRaceScript({
    entrants: field(people, tickets),
    winner: { characterId: "c0", ticketNo: tickets },
    durationSeconds,
    random: seededRandom(seed),
  });
}

/** Fields the script is checked against: a duel, tiny, small, normal, big and the largest field. */
const FIELD_SIZES = [2, 3, 8, 30, 80, 240];
const SEEDS = Array.from({ length: 12 }, (_, index) => index + 1);
/** Race-time step when walking a script; fine enough to see every lead change. */
const SAMPLE_STEP = 0.002;
const MONOTONE_STEP = 0.01;

/** Race time after which the winner and the contenders leave the pack. */
const REVEAL_U = 0.7;
/** Closest any cat outside the finish ends to the line, as a share of the track. */
const FIELD_NEAREST_SHORTFALL = 0.035;

/**
 * How often the lead changes from one moment to the finish.
 * @param script - The race
 * @param from - Race time to start counting at
 * @returns Lead changes after `from`
 */
function leadChangesAfter(script: ReturnType<typeof scriptFor>, from: number): number {
  let leader: string | null = null;
  let changes = 0;
  for (let u = from; u <= 1 + SAMPLE_STEP; u += SAMPLE_STEP) {
    const [front] = rankAt(script, u);
    if (front !== leader && leader !== null) changes += 1;
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

describe("buildRaceScript", () => {
  it("makes the winner cross exactly at u = 1, ahead of everyone", () => {
    for (const people of FIELD_SIZES) {
      for (const seed of SEEDS) {
        const script = scriptFor(people, 1, 12, seed);

        expect(script.winnerKey).toBe(catKey("c0", 1));
        expect(progressAt(script.curves.get(script.winnerKey)!, 1)).toBe(1);
        expect(rankAt(script, 1)[0]).toBe(script.winnerKey);
        for (const cat of script.cats) {
          if (cat.key === script.winnerKey) continue;
          expect(progressAt(script.curves.get(cat.key)!, 1)).toBeLessThan(1);
        }
      }
    }
  });

  it("starts every cat at 0 and never moves one backwards", () => {
    for (const people of FIELD_SIZES) {
      for (const seed of SEEDS) {
        for (const curve of scriptFor(people, 1, 12, seed).curves.values()) {
          expect(progressAt(curve, 0)).toBe(0);
          expect(steepestDrop(curve)).toBeLessThanOrEqual(1e-12);
        }
      }
    }
  });

  it("leaves the runner-up between one thousandth and two hundredths short of the line", () => {
    for (const people of FIELD_SIZES) {
      for (const seed of SEEDS) {
        const { runnerUpGap } = scriptFor(people, 1, 12, seed);

        expect(runnerUpGap).toBeGreaterThanOrEqual(0.001);
        expect(runnerUpGap).toBeLessThanOrEqual(0.02);
      }
    }
  });

  it("keeps the winner's pace curve at 1 beyond the end", () => {
    const script = scriptFor(8, 1);

    expect(progressAt(script.curves.get(script.winnerKey)!, 3)).toBe(1);
    expect(progressAt(script.curves.get(script.winnerKey)!, -1)).toBe(0);
  });

  it("changes the lead at least once on average after the reveal point", () => {
    const rounds = SEEDS.map((seed) => leadChangesAfter(scriptFor(80, 1, 12, seed), REVEAL_U));
    const average = rounds.reduce((sum, changes) => sum + changes, 0) / rounds.length;

    expect(average).toBeGreaterThanOrEqual(1);
  });

  it("brings the winner and 2 to 4 contenders to the line together in a big field", () => {
    for (const seed of SEEDS) {
      const script = scriptFor(80, 1, 12, seed);
      const closeToLine = script.cats.filter(
        (cat) => progressAt(script.curves.get(cat.key)!, 1) > 1 - FIELD_NEAREST_SHORTFALL
      );

      expect(closeToLine.length).toBeGreaterThanOrEqual(3);
      expect(closeToLine.length).toBeLessThanOrEqual(5);
    }
  });

  it("runs with fewer contenders when the field is too small, without error", () => {
    for (const people of [1, 2, 3]) {
      for (const seed of SEEDS) {
        const script = scriptFor(people, 1, 12, seed);

        expect(rankAt(script, 1)[0]).toBe(script.winnerKey);
        expect(script.cats).toHaveLength(people);
      }
    }
  });

  it("keeps the pack close to the winner at the halfway mark", () => {
    const script = scriptFor(80, 3, 12, 4);
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
      random: seededRandom(1),
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
  it("names the cat rankAt puts first at every moment", () => {
    const script = buildRaceScript({
      entrants: Array.from({ length: 30 }, (_, index) => ({ characterId: `c${index}`, tickets: 1 })),
      winner: { characterId: "c7", ticketNo: 1 },
      durationSeconds: 20,
      random: seededRandom(11),
    });
    for (let u = 0; u <= 1; u += 0.05) {
      expect(leaderAt(script, u)).toBe(rankAt(script, u)[0]);
    }
  });
});

const REVEAL_ROUNDS = 2000;
/** Race times before the reveal point (0.7) at which the pack must not tell who wins. */
const HIDDEN_CHECKPOINTS = [0.12, 0.3, 0.5];
const HIDDEN_TOLERANCE = 0.03;
const TOP_PLACES = 3;

/**
 * How often the winner, drawn uniformly, sits in the front places at one moment.
 * @param people - Field size, one ticket each
 * @param u - Race time
 * @param places - How many front places count
 * @returns Share of rounds in `[0, 1]`
 */
function winnerInFrontShare(people: number, u: number, places: number): number {
  const entrants = field(people, 1);
  const random = seededRandom(2026);
  let hits = 0;
  for (let round = 0; round < REVEAL_ROUNDS; round += 1) {
    const winner = entrants[Math.floor(random() * people)];
    const script = buildRaceScript({
      entrants,
      winner: { characterId: winner.characterId, ticketNo: 1 },
      durationSeconds: 12,
      random,
    });
    if (rankAt(script, u).indexOf(script.winnerKey) < places) hits += 1;
  }

  return hits / REVEAL_ROUNDS;
}

describe("buildRaceScript before the reveal", () => {
  it.each(HIDDEN_CHECKPOINTS)("does not show the winner in the top 3 of 80 cats at u = %s", (u) => {
    expect(Math.abs(winnerInFrontShare(80, u, TOP_PLACES) - TOP_PLACES / 80)).toBeLessThanOrEqual(HIDDEN_TOLERANCE);
  });

  it.each(HIDDEN_CHECKPOINTS)("does not show the winner leading among 3 cats at u = %s", (u) => {
    expect(Math.abs(winnerInFrontShare(3, u, 1) - 1 / 3)).toBeLessThanOrEqual(HIDDEN_TOLERANCE);
  });
});
