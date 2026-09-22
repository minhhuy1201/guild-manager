import { describe, expect, it } from "vitest";

import {
  SELECTION_ACTIONS_HEIGHT,
  selectionPlacement,
} from "../lib/selection-anchor";
import { INITIAL_ZOOM } from "../lib/zoom";
import type { StageViewport } from "../lib/stage-scale";

/** A canvas 1000×500 showing the map at scale 1, which keeps the arithmetic readable. */
const VIEWPORT: StageViewport = { width: 1000, height: 500, fitScale: 1 };

describe("selectionPlacement", () => {
  it("sits just under the element, centred on it", () => {
    const placement = selectionPlacement(
      { centerX: 400, top: 180, bottom: 220 },
      VIEWPORT,
      INITIAL_ZOOM
    );

    expect(placement).not.toBeNull();
    expect(placement?.above).toBe(false);
    expect(placement?.left).toBe(400);
    expect(placement?.top).toBeGreaterThan(220);
  });

  it("flips above an element too close to the bottom edge to fit under", () => {
    const placement = selectionPlacement(
      { centerX: 400, top: 440, bottom: 490 },
      VIEWPORT,
      INITIAL_ZOOM
    );

    expect(placement?.above).toBe(true);
    expect(placement?.top).toBeLessThan(440);
  });

  it("follows the zoom and the pan, because the element does", () => {
    const zoomed = selectionPlacement(
      { centerX: 100, top: 180, bottom: 200 },
      VIEWPORT,
      { zoom: 2, offset: { x: -50, y: -100 } }
    );

    expect(zoomed?.left).toBe(150);
    expect(zoomed?.top).toBeGreaterThan(300);
  });

  it("keeps the bar inside the canvas when the element hugs an edge", () => {
    const left = selectionPlacement(
      { centerX: 2, top: 180, bottom: 200 },
      VIEWPORT,
      INITIAL_ZOOM
    );
    const right = selectionPlacement(
      { centerX: 998, top: 180, bottom: 200 },
      VIEWPORT,
      INITIAL_ZOOM
    );

    expect(left?.left).toBeGreaterThan(2);
    expect(right?.left).toBeLessThan(998);
  });

  it("centres the bar when the canvas is narrower than the bar itself", () => {
    const placement = selectionPlacement(
      { centerX: 10, top: 10, bottom: 20 },
      { width: 120, height: 500, fitScale: 1 },
      INITIAL_ZOOM
    );

    expect(placement?.left).toBe(60);
  });

  it("hides while a pan has pushed the element off the canvas", () => {
    expect(
      selectionPlacement({ centerX: 400, top: 180, bottom: 220 }, VIEWPORT, {
        zoom: 1,
        offset: { x: -900, y: 0 },
      })
    ).toBeNull();
    expect(
      selectionPlacement({ centerX: 400, top: 180, bottom: 220 }, VIEWPORT, {
        zoom: 1,
        offset: { x: 0, y: -400 },
      })
    ).toBeNull();
  });

  it("reserves its own height when deciding which side to sit on", () => {
    expect(SELECTION_ACTIONS_HEIGHT).toBeGreaterThan(0);
  });
});
