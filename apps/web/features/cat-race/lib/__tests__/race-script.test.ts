import { describe, expect, it } from "vitest";

import {
  FINISH_HOLD_SECONDS,
  buildRaceScript,
  catKey,
  progressAt,
  rankAt,
} from "../race-script";

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
 * @returns The script
 */
function scriptFor(
  people: number,
  tickets: number,
  durationSeconds = 12,
  seed = 7
) {
  return buildRaceScript({
    entrants: field(people, tickets),
    winner: { characterId: "c0", ticketNo: tickets },
    durationSeconds,
    random: seeded(seed),
  });
}

describe("buildRaceScript", () => {
  it.each([10, 12, 40])(
    "makes the winning ticket cross exactly at %i seconds, ahead of everyone",
    (duration) => {
      const script = scriptFor(80, 3, duration);
      const winnerMotion = script.motions.get(script.winnerKey)!;

      expect(script.winnerKey).toBe(catKey("c0", 3));
      expect(script.durationSeconds).toBe(duration);
      expect(script.endSeconds).toBeCloseTo(duration + FINISH_HOLD_SECONDS);
      expect(progressAt(winnerMotion, duration)).toBe(1);
      for (const cat of script.cats) {
        if (cat.key === script.winnerKey) continue;
        expect(progressAt(script.motions.get(cat.key)!, duration)).toBeLessThan(1);
      }
    }
  );

  it.each([10, 12, 40])("never moves a cat backwards in a %i second race", (duration) => {
    for (const seed of [11, 12]) {
      const script = scriptFor(10, 3, duration, seed);

      for (const motion of script.motions.values()) {
        let last = 0;
        for (let t = 0; t <= duration * 2; t += 0.02) {
          const now = progressAt(motion, t);
          expect(now).toBeGreaterThanOrEqual(last - 1e-12);
          last = now;
        }
        expect(progressAt(motion, motion.finishAt)).toBe(1);
        expect(progressAt(motion, motion.finishAt * 2)).toBe(1);
      }
    }
  });

  it("starts every cat at progress 0", () => {
    const script = scriptFor(80, 3);

    for (const motion of script.motions.values()) expect(progressAt(motion, 0)).toBe(0);
  });

  it("ranks the winner first from the moment it crosses on, whatever the seed", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const script = scriptFor(80, 3, 12, seed);

      expect(rankAt(script, script.durationSeconds)[0]).toBe(script.winnerKey);
      expect(rankAt(script, script.endSeconds)).toEqual(rankAt(script, script.durationSeconds));
    }
  });

  it("ranks every cat once", () => {
    const script = scriptFor(80, 3);

    expect(new Set(rankAt(script, 5)).size).toBe(240);
  });

  it("has one cat per person in standard mode", () => {
    expect(scriptFor(30, 1).cats).toHaveLength(30);
  });

  it("races a field of two", () => {
    const script = scriptFor(2, 1);

    expect(rankAt(script, script.durationSeconds)).toEqual([script.winnerKey, catKey("c1", 1)]);
  });
});
