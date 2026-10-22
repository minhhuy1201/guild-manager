import { describe, expect, it } from "vitest";

import { MAX_DUST, dustChance, spawnDust, stepDust, type DustParticle } from "../race-dust";

const CAT = { x: 100, y: 50, width: 28, height: 20, catHeight: 24 };
const FRAME = { alive: 0, dt: 1 / 60, catCount: 30 };

describe("dustChance", () => {
  it("falls as the field grows", () => {
    expect(dustChance(1 / 60, 30)).toBeCloseTo(0.18);
    expect(dustChance(1 / 60, 240)).toBeCloseTo(0.18 / 8);
  });

  it("is per frame, not per second", () => {
    expect(dustChance(1 / 30, 30)).toBeCloseTo(0.36);
  });
});

describe("spawnDust", () => {
  it("puffs behind the back foot with a backward and upward drift", () => {
    const sequence = [0, 0.5, 0.5];
    const puff = spawnDust(CAT, FRAME, () => sequence.shift()!);

    expect(puff).toEqual({ x: 102, y: 57.6, vx: -35, vy: -13, size: 2, life: 0.5, maxLife: 0.5 });
  });

  it("does not spawn when the roll misses", () => {
    expect(spawnDust(CAT, FRAME, () => 0.99)).toBeNull();
  });

  it("never lets the dust pass the cap", () => {
    expect(spawnDust(CAT, { ...FRAME, alive: MAX_DUST }, () => 0)).toBeNull();
    expect(spawnDust(CAT, { ...FRAME, alive: MAX_DUST - 1 }, () => 0)).not.toBeNull();
  });
});

describe("stepDust", () => {
  const puff: DustParticle = { x: 10, y: 10, vx: -20, vy: -10, size: 2, life: 0.5, maxLife: 0.5 };

  it("moves a particle and ages it without touching the input", () => {
    const [moved] = stepDust([puff], 0.1);

    expect(moved).toMatchObject({ x: 8, y: 9, life: 0.4 });
    expect(puff.life).toBe(0.5);
  });

  it("drops a particle whose life has run out", () => {
    expect(stepDust([puff], 0.5)).toEqual([]);
  });
});
