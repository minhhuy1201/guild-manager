import { describe, expect, it } from "vitest";

import { LANE_MAX_HEIGHT, LANE_MIN_HEIGHT, laneCenterY, laneLayout, progressX } from "../race-layout";

const VIEWPORT = { width: 900, height: 600 };

describe("laneLayout", () => {
  it("keeps every lane at least the minimum even for 240 cats, and lets the track scroll", () => {
    const layout = laneLayout(240, VIEWPORT);

    expect(layout.laneHeight).toBe(LANE_MIN_HEIGHT);
    expect(layout.contentHeight).toBe(240 * LANE_MIN_HEIGHT);
    expect(layout.contentHeight).toBeGreaterThan(VIEWPORT.height);
  });

  it("fits a small field in the viewport and caps the lane height", () => {
    expect(laneLayout(20, VIEWPORT).laneHeight).toBe(30);
    expect(laneLayout(2, VIEWPORT).laneHeight).toBe(LANE_MAX_HEIGHT);
  });

  it("leaves room for the name column on a 360px phone", () => {
    const layout = laneLayout(30, { width: 360, height: 600 });

    expect(layout.nameColumn).toBeGreaterThanOrEqual(96);
    expect(layout.travel).toBeGreaterThan(100);
    expect(layout.finishX).toBeLessThanOrEqual(360);
  });

  it("makes the nose touch the finish line at progress 1", () => {
    const layout = laneLayout(30, VIEWPORT);

    expect(progressX(1, layout) + layout.catWidth).toBe(layout.finishX);
  });
});

describe("progressX", () => {
  it("is the start line at 0 and grows with progress", () => {
    const layout = laneLayout(30, VIEWPORT);

    expect(progressX(0, layout)).toBe(layout.startX);
    expect(progressX(0.5, layout)).toBeGreaterThan(progressX(0.25, layout));
  });
});

describe("laneCenterY", () => {
  it("centres each lane and never repeats a line", () => {
    const layout = laneLayout(30, VIEWPORT);
    const centres = Array.from({ length: 30 }, (_, index) => laneCenterY(index, layout));

    expect(centres[0]).toBe(layout.laneHeight / 2);
    expect(new Set(centres).size).toBe(30);
  });
});
