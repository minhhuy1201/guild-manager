import { describe, expect, it } from "vitest";

import { formatLengths, lengthsBehind } from "../race-lengths";
import { laneLayout } from "../race-layout";

const LAYOUT = laneLayout(8, { width: 800, height: 400 });

describe("lengthsBehind", () => {
  it("counts the gap in cat bodies of the track it is seen on", () => {
    const gap = 0.05;

    expect(lengthsBehind(gap, LAYOUT)).toBeCloseTo((gap * LAYOUT.travel) / LAYOUT.catWidth);
  });

  it("is zero for no gap and never negative", () => {
    expect(lengthsBehind(0, LAYOUT)).toBe(0);
    expect(lengthsBehind(0.1, { ...LAYOUT, travel: -50 })).toBe(0);
  });
});

describe("formatLengths", () => {
  it("uses one decimal and a comma", () => {
    expect(formatLengths(1.234)).toBe("1,2");
    expect(formatLengths(0)).toBe("0,0");
  });
});
