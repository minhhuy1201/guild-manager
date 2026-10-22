import { describe, expect, it } from "vitest";

import {
  BAND_HEIGHT,
  BAND_HEIGHT_NARROW,
  LANE_MAX_HEIGHT,
  LANE_MIN_HEIGHT,
  laneCenterY,
  laneLayout,
  markX,
  progressX,
  visibleLanes,
} from "../race-layout";

const VIEWPORT = { width: 900, height: 600 };

describe("laneLayout", () => {
  it("keeps every lane at least the minimum even for 240 cats, and lets the track scroll", () => {
    const layout = laneLayout(240, VIEWPORT);

    expect(layout.laneHeight).toBe(LANE_MIN_HEIGHT);
    expect(layout.contentHeight).toBe(BAND_HEIGHT + 240 * LANE_MIN_HEIGHT);
    expect(layout.contentHeight).toBeGreaterThan(VIEWPORT.height);
  });

  it("fits a small field under the sky band and caps the lane height", () => {
    expect(laneLayout(20, VIEWPORT).laneHeight).toBeCloseTo((600 - BAND_HEIGHT) / 20);
    expect(laneLayout(2, VIEWPORT).laneHeight).toBe(LANE_MAX_HEIGHT);
  });

  it("lays out a 360px phone: low sky band, 108px names, start 6px right of them, 46px behind the finish", () => {
    const layout = laneLayout(30, { width: 360, height: 600 });

    expect(layout.band).toBe(BAND_HEIGHT_NARROW);
    expect(layout.nameColumn).toBe(108);
    expect(layout.startX).toBe(114);
    expect(layout.finishX).toBe(314);
    expect(layout.travel).toBe(314 - layout.catWidth - 114);
    expect(layout.travel).toBeGreaterThan(100);
  });

  it("lays out a 1440px desktop: full sky band, names capped at 196px", () => {
    const layout = laneLayout(30, { width: 1440, height: 800 });

    expect(layout.band).toBe(BAND_HEIGHT);
    expect(layout.nameColumn).toBe(196);
    expect(layout.startX).toBe(202);
    expect(layout.finishX).toBe(1394);
  });

  it("takes 20% of the width for names between the limits, and switches band height at 600px", () => {
    expect(laneLayout(30, { width: 800, height: 600 }).nameColumn).toBe(160);
    expect(laneLayout(30, { width: 599, height: 600 }).band).toBe(BAND_HEIGHT_NARROW);
    expect(laneLayout(30, { width: 600, height: 600 }).band).toBe(BAND_HEIGHT);
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

describe("markX", () => {
  it("puts the start post at the cat's nose and the end of the track on the finish line", () => {
    const layout = laneLayout(30, VIEWPORT);

    expect(markX(0, layout)).toBe(layout.startX + layout.catWidth);
    expect(markX(1, layout)).toBe(layout.finishX);
  });
});

describe("laneCenterY", () => {
  it("centres each lane under the sky band and never repeats a line", () => {
    const layout = laneLayout(30, VIEWPORT);
    const centres = Array.from({ length: 30 }, (_, index) => laneCenterY(index, layout));

    expect(centres[0]).toBe(layout.band + layout.laneHeight / 2);
    expect(new Set(centres).size).toBe(30);
  });
});

describe("visibleLanes", () => {
  it("shows a few dozen of 240 lanes and follows the scroll", () => {
    const layout = laneLayout(240, { width: 900, height: 400 });

    expect(visibleLanes(layout, 240, 0, 400)).toEqual({ first: 0, last: 13 });
    const scrolled = visibleLanes(layout, 240, 220, 400);
    expect(scrolled.first).toBe(10);
    expect(scrolled.last - scrolled.first).toBeLessThan(20);
  });

  it("stops at the last lane for a small field", () => {
    const layout = laneLayout(3, { width: 900, height: 600 });

    expect(visibleLanes(layout, 3, 0, 600)).toEqual({ first: 0, last: 2 });
  });
});
