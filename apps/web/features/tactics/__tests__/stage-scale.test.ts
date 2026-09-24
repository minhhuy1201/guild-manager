import { describe, expect, it } from "vitest";
import { TACTIC_MAP_HEIGHT, TACTIC_MAP_WIDTH } from "@guild/shared/schemas";

import { canvasToMapPoint, stageScale, toMapPoint } from "../lib/stage-scale";

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

  it("maps a canvas point to the map at the fit scale, unmoved", () => {
    expect(
      canvasToMapPoint({ x: 100, y: 50 }, { zoom: 1, offset: { x: 0, y: 0 } }, 0.5)
    ).toEqual({ x: 200, y: 100 });
  });

  it("takes the pan off and the zoom out when mapping a canvas point", () => {
    expect(
      canvasToMapPoint({ x: 140, y: 90 }, { zoom: 2, offset: { x: -60, y: 10 } }, 0.5)
    ).toEqual({ x: 200, y: 80 });
  });

  it("keeps the map's aspect ratio", () => {
    const scale = stageScale(TACTIC_MAP_WIDTH / 2);

    expect(TACTIC_MAP_HEIGHT * scale).toBeCloseTo(TACTIC_MAP_HEIGHT / 2);
  });

  it("never scales to zero, so a stage measured before layout still draws", () => {
    expect(stageScale(0)).toBeGreaterThan(0);
  });
});
