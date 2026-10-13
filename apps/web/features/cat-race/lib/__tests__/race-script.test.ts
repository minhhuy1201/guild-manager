import { describe, expect, it } from "vitest";

import {
  FINALIST_COUNT,
  FIRST_CHECKPOINT,
  RACE_DURATION_SECONDS,
  SECOND_CHECKPOINT,
  buildRaceScript,
  catKey,
  cutAtFirstCheckpoint,
  progressAt,
  rankAt,
  type RaceSpeed,
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
 * @param speed - Race speed
 * @param seed - PRNG seed
 * @returns The script
 */
function scriptFor(
  people: number,
  tickets: number,
  speed: RaceSpeed = "NORMAL",
  seed = 7
) {
  return buildRaceScript({
    entrants: field(people, tickets),
    winner: { characterId: "c0", ticketNo: tickets },
    speed,
    random: seeded(seed),
  });
}

describe("buildRaceScript", () => {
  it("makes the winning ticket cross exactly at the chosen duration, ahead of everyone", () => {
    const script = scriptFor(80, 3);
    const duration = RACE_DURATION_SECONDS.NORMAL;
    const winnerMotion = script.motions.get(script.winnerKey)!;

    expect(script.winnerKey).toBe(catKey("c0", 3));
    expect(progressAt(winnerMotion, duration)).toBe(1);
    for (const cat of script.cats) {
      if (cat.key === script.winnerKey) continue;
      expect(progressAt(script.motions.get(cat.key)!, duration)).toBeLessThan(1);
    }
  });

  it.each(["FAST", "NORMAL", "SLOW"] as const)(
    "never moves a cat backwards at %s speed",
    (speed) => {
      const script = scriptFor(40, 3, speed, 11);
      const duration = RACE_DURATION_SECONDS[speed];

      for (const motion of script.motions.values()) {
        let last = 0;
        for (let t = 0; t <= duration * 2; t += 0.01) {
          const now = progressAt(motion, t);
          expect(now).toBeGreaterThanOrEqual(last - 1e-12);
          last = now;
        }
        expect(progressAt(motion, motion.finishAt)).toBe(1);
        expect(progressAt(motion, motion.finishAt * 2)).toBe(1);
      }
    }
  );

  it("picks 8 finalists including the winner from a 240-cat field, and every cut cat trails them at the second checkpoint", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const script = scriptFor(80, 3, "NORMAL", seed);
      const at = SECOND_CHECKPOINT * script.durationSeconds;
      const finalists = [...script.finalistKeys];
      const slowestFinalist = Math.min(
        ...finalists.map((key) => progressAt(script.motions.get(key)!, at))
      );

      expect(script.cats).toHaveLength(240);
      expect(script.finalistKeys.size).toBe(FINALIST_COUNT);
      expect(script.finalistKeys.has(script.winnerKey)).toBe(true);
      for (const cat of script.cats) {
        if (script.finalistKeys.has(cat.key)) continue;
        expect(progressAt(script.motions.get(cat.key)!, at)).toBeLessThan(
          slowestFinalist
        );
      }
    }
  });

  it("cuts only non-finalists from the back half at the first checkpoint", () => {
    const script = scriptFor(80, 3);
    const cut = cutAtFirstCheckpoint(script);
    const ranking = rankAt(script, FIRST_CHECKPOINT * script.durationSeconds);
    const half = ranking.length / 2;

    expect(cut.size).toBeGreaterThan(0);
    for (const key of cut) {
      expect(script.finalistKeys.has(key)).toBe(false);
      expect(ranking.indexOf(key)).toBeGreaterThanOrEqual(half);
    }
  });

  it.each([8, 2])("skips elimination when the field is %i cats", (size) => {
    const script = scriptFor(size, 1);

    expect(script.eliminates).toBe(false);
    expect(script.finalistKeys.size).toBe(size);
    expect(cutAtFirstCheckpoint(script).size).toBe(0);
  });

  it("has one cat per person in standard mode", () => {
    expect(scriptFor(30, 1).cats).toHaveLength(30);
  });
});
