import { describe, expect, it } from "vitest";
import { TACTIC_MAP_HEIGHT, TACTIC_MAP_WIDTH } from "@guild/shared/schemas";

import { fitStageWidth } from "../lib/stage-scale";

describe("fitStageWidth", () => {
  it("a window wider than the map is limited by its height", () => {
    const height = 500;

    expect(fitStageWidth(3000, height)).toBeCloseTo(
      (height * TACTIC_MAP_WIDTH) / TACTIC_MAP_HEIGHT
    );
  });

  it("a window taller than the map is limited by its width", () => {
    expect(fitStageWidth(800, 3000)).toBe(800);
  });

  it("a window with exactly the map's shape is filled", () => {
    expect(
      fitStageWidth(TACTIC_MAP_WIDTH, TACTIC_MAP_HEIGHT)
    ).toBeCloseTo(TACTIC_MAP_WIDTH);
  });

  it("an area not measured yet gives no width, never a negative or NaN one", () => {
    expect(fitStageWidth(0, 0)).toBe(0);
    expect(fitStageWidth(-5, 300)).toBe(0);
    expect(fitStageWidth(300, -5)).toBe(0);
    expect(fitStageWidth(Number.NaN, 300)).toBe(0);
  });
});
