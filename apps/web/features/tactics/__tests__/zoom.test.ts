import { describe, expect, it } from "vitest";

import {
  INITIAL_ZOOM,
  ZOOM_MAX,
  ZOOM_MIN,
  clampZoom,
  panBy,
  zoomAt,
  zoomLabel,
} from "../lib/zoom";

describe("map zoom", () => {
  it("starts at the fit scale, unmoved", () => {
    expect(INITIAL_ZOOM).toEqual({ zoom: 1, offset: { x: 0, y: 0 } });
  });

  it("keeps the zoom inside its range", () => {
    expect(clampZoom(100)).toBe(ZOOM_MAX);
    expect(clampZoom(0.01)).toBe(ZOOM_MIN);
  });

  it("keeps the point under the pointer in place while zooming", () => {
    const fitScale = 0.5;
    const pointer = { x: 200, y: 100 };
    const before = (pointer.x - INITIAL_ZOOM.offset.x) / (fitScale * 1);

    const next = zoomAt(INITIAL_ZOOM, pointer, 2, fitScale);
    const after = (pointer.x - next.offset.x) / (fitScale * next.zoom);

    expect(next.zoom).toBe(2);
    expect(after).toBeCloseTo(before);
  });

  it("returns the same state once it is already at a limit", () => {
    const atMax = { zoom: ZOOM_MAX, offset: { x: 10, y: 10 } };

    expect(zoomAt(atMax, { x: 0, y: 0 }, 2, 0.5)).toBe(atMax);
  });

  it("moves the map by a drag", () => {
    expect(panBy(INITIAL_ZOOM, 30, -10).offset).toEqual({ x: 30, y: -10 });
  });

  it("reads the zoom as a percentage", () => {
    expect(zoomLabel(1)).toBe("100%");
    expect(zoomLabel(1.5)).toBe("150%");
  });
});
