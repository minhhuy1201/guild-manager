import { describe, expect, it } from "vitest";
import { TACTIC_MAP_HEIGHT, TACTIC_MAP_WIDTH } from "@guild/shared/schemas";

import { stageScale, toMapPoint } from "../lib/stage-scale";

describe("stage scale", () => {
  it("is 1 when the stage is exactly the map's width", () => {
    expect(stageScale(TACTIC_MAP_WIDTH)).toBe(1);
  });

  it("halves when the stage is half the map's width", () => {
    expect(stageScale(TACTIC_MAP_WIDTH / 2)).toBe(0.5);
  });

  it("maps a screen pointer back into map space", () => {
    expect(toMapPoint({ x: 100, y: 50 }, 0.5)).toEqual({ x: 200, y: 100 });
  });

  it("keeps the map's aspect ratio", () => {
    const scale = stageScale(TACTIC_MAP_WIDTH / 2);

    expect(TACTIC_MAP_HEIGHT * scale).toBeCloseTo(TACTIC_MAP_HEIGHT / 2);
  });

  it("never scales to zero, so a stage measured before layout still draws", () => {
    expect(stageScale(0)).toBeGreaterThan(0);
  });
});
