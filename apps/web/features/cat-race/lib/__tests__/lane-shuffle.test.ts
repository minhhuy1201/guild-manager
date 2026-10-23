import { describe, expect, it } from "vitest";

import { LANE_SHUFFLE_MS, isShuffling, isTrotting, lanesAt, type LaneShuffle } from "../lane-shuffle";

const SWAP: LaneShuffle = {
  from: new Map([
    ["a", 0],
    ["b", 1],
    ["c", 2],
  ]),
  to: new Map([
    ["a", 1],
    ["b", 0],
    ["c", 2],
  ]),
  startedAt: 1000,
};

describe("lanesAt", () => {
  it("starts every cat in its old lane and ends it in its new one", () => {
    expect(lanesAt(SWAP, 1000)).toEqual(SWAP.from);
    expect(lanesAt(SWAP, 1000 + LANE_SHUFFLE_MS)).toEqual(SWAP.to);
    expect(lanesAt(SWAP, 1000 + LANE_SHUFFLE_MS * 3)).toEqual(SWAP.to);
  });

  it("passes the two swapped cats at the halfway mark", () => {
    const halfway = lanesAt(SWAP, 1000 + LANE_SHUFFLE_MS / 2);

    expect(halfway.get("a")).toBeCloseTo(0.5);
    expect(halfway.get("b")).toBeCloseTo(0.5);
    expect(halfway.get("c")).toBe(2);
  });

  it("moves slowly off the line and into the new lane", () => {
    const early = lanesAt(SWAP, 1000 + LANE_SHUFFLE_MS / 10).get("a")!;

    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(0.1);
  });

  it("puts a cat the old order did not have straight into its new lane", () => {
    const joined = { ...SWAP, to: new Map([...SWAP.to, ["d", 3]]) };

    expect(lanesAt(joined, 1000).get("d")).toBe(3);
  });
});

describe("isShuffling", () => {
  it("holds until the cats arrive", () => {
    expect(isShuffling(null, 0)).toBe(false);
    expect(isShuffling(SWAP, 1000 + LANE_SHUFFLE_MS - 1)).toBe(true);
    expect(isShuffling(SWAP, 1000 + LANE_SHUFFLE_MS)).toBe(false);
  });
});

describe("isTrotting", () => {
  it("runs the legs of a cat that changes lane, only while it moves", () => {
    const during = 1000 + LANE_SHUFFLE_MS / 2;

    expect(isTrotting(SWAP, "a", during)).toBe(true);
    expect(isTrotting(SWAP, "c", during)).toBe(false);
    expect(isTrotting(SWAP, "a", 1000 + LANE_SHUFFLE_MS)).toBe(false);
    expect(isTrotting(null, "a", during)).toBe(false);
  });
});
