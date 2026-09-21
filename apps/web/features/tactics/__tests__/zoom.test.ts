import { describe, expect, it } from "vitest";
import { TACTIC_MAP_WIDTH } from "@guild/shared/schemas";

import { stageViewport } from "../lib/stage-scale";
import {
  INITIAL_ZOOM,
  ZOOM_MAX,
  ZOOM_MIN,
  clampOffset,
  clampZoom,
  panBy,
  zoomAt,
  zoomLabel,
} from "../lib/zoom";

/** The canvas every test zooms inside: half the map, so the fit scale is 0.5. */
const VIEWPORT = stageViewport(TACTIC_MAP_WIDTH / 2);

describe("map zoom", () => {
  it("starts at the fit scale, unmoved", () => {
    expect(INITIAL_ZOOM).toEqual({ zoom: 1, offset: { x: 0, y: 0 } });
  });

  it("keeps the zoom inside its range", () => {
    expect(clampZoom(100)).toBe(ZOOM_MAX);
    expect(clampZoom(0.01)).toBe(ZOOM_MIN);
  });

  it("does not zoom out past the minimum", () => {
    expect(ZOOM_MIN).toBe(0.87);
  });

  it("keeps the point under the pointer in place while zooming", () => {
    const pointer = { x: 200, y: 100 };
    const before = (pointer.x - INITIAL_ZOOM.offset.x) / (VIEWPORT.fitScale * 1);

    const next = zoomAt(INITIAL_ZOOM, pointer, 2, VIEWPORT);
    const after = (pointer.x - next.offset.x) / (VIEWPORT.fitScale * next.zoom);

    expect(next.zoom).toBe(2);
    expect(after).toBeCloseTo(before);
  });

  it("returns the same state once it is already at a limit", () => {
    const atMax = { zoom: ZOOM_MAX, offset: { x: 10, y: 10 } };

    expect(zoomAt(atMax, { x: 0, y: 0 }, 2, VIEWPORT)).toBe(atMax);
  });

  it("centres the map once it is smaller than the canvas", () => {
    const zoomedOut = clampOffset(
      { zoom: ZOOM_MIN, offset: { x: 400, y: -900 } },
      VIEWPORT
    );

    expect(zoomedOut.offset.x).toBeCloseTo(
      (VIEWPORT.width - VIEWPORT.width * ZOOM_MIN) / 2
    );
    expect(zoomedOut.offset.y).toBeCloseTo(
      (VIEWPORT.height - VIEWPORT.height * ZOOM_MIN) / 2
    );
  });

  it("moves the map by a drag, as far as its own edges", () => {
    const zoomedIn = { zoom: 2, offset: { x: -100, y: -100 } };

    expect(panBy(zoomedIn, 30, -10, VIEWPORT).offset).toEqual({
      x: -70,
      y: -110,
    });
    // The drag asks for a strip of empty canvas on the left; the map stops at its own edge.
    expect(panBy(zoomedIn, 500, 0, VIEWPORT).offset.x).toBe(0);
  });

  it("keeps a drag from opening a gap on the far side", () => {
    const zoomedIn = { zoom: 2, offset: { x: 0, y: 0 } };
    const panned = panBy(zoomedIn, -5000, 0, VIEWPORT);

    expect(panned.offset.x).toBeCloseTo(VIEWPORT.width - VIEWPORT.width * 2);
  });

  it("reads the zoom as a percentage", () => {
    expect(zoomLabel(1)).toBe("100%");
    expect(zoomLabel(1.5)).toBe("150%");
  });
});
