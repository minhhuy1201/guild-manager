import { describe, expect, it } from "vitest";

import { bobOffset, legClock, legFrame, speedAt } from "../cat-motion";

describe("legClock", () => {
  it("follows race time, so it stands still when the cats do", () => {
    expect(legClock(0, 12)).toBe(0);
    expect(legClock(0.5, 10)).toBe(45);
    expect(legClock(1, 10)).toBe(90);
  });
});

describe("legFrame", () => {
  it("stands at frame 0 until the cats run", () => {
    expect(legFrame(123.4, 5, false)).toBe(0);
  });

  it("cycles through the four frames", () => {
    expect([0, 1, 2, 3, 4, 5].map((clock) => legFrame(clock, 0, true))).toEqual([0, 1, 2, 3, 0, 1]);
  });

  it("puts neighbouring lanes out of step", () => {
    expect(legFrame(0.7, 0, true)).toBe(0);
    expect(legFrame(0.7, 1, true)).toBe(1);
  });
});

describe("bobOffset", () => {
  it("lifts the body on even frames only while running", () => {
    expect(bobOffset(0, 28, true)).toBe(-2);
    expect(bobOffset(2, 28, true)).toBe(-2);
    expect(bobOffset(1, 28, true)).toBe(0);
    expect(bobOffset(0, 28, false)).toBe(0);
  });

  it("lifts at least one pixel on a small cat", () => {
    expect(bobOffset(0, 8, true)).toBe(-1);
  });
});

describe("speedAt", () => {
  it("is 1 on an even pace", () => {
    expect(speedAt((u) => u, 0.5)).toBeCloseTo(1);
  });

  it("reads half the speed at the ends of the race, where the window is cut short", () => {
    expect(speedAt((u) => u, 0)).toBeCloseTo(0.5);
    expect(speedAt((u) => u, 1)).toBeCloseTo(0.5);
  });

  it("reads a burst as faster than even pace", () => {
    expect(speedAt((u) => u * u, 0.8)).toBeCloseTo(1.6);
  });
});
