// @vitest-environment jsdom
import { act, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TACTIC_MAP_WIDTH } from "@guild/shared/schemas";

import { stageViewport } from "../../lib/stage-scale";
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from "../../lib/zoom";
import { useStageZoom } from "../use-stage-zoom";
import { renderTacticHook } from "./render-tactic-hook";

/** The canvas width every test zooms inside: half the map, so the fit scale is 0.5. */
const WIDTH = TACTIC_MAP_WIDTH / 2;

/** That canvas, as the zoom sees it. */
const VIEWPORT = stageViewport(WIDTH);

/**
 * A wheel event as Konva reports it.
 * @param deltaY - Negative zooms in, positive zooms out
 * @param pointer - Where the pointer sits on the canvas
 * @returns The event object the handler reads
 */
function wheelEvent(deltaY: number, pointer = { x: 100, y: 50 }) {
  return {
    evt: { deltaY, preventDefault: () => {} },
    target: { getStage: () => ({ getPointerPosition: () => pointer }) },
  } as never;
}

/**
 * A mouse-down event as Konva reports it.
 * @param button - Which button is down; 1 is the middle one
 * @param client - Pointer position in client coordinates
 * @returns The event object the handler reads
 */
function mouseEvent(button: number, client = { x: 0, y: 0 }) {
  return {
    evt: {
      button,
      clientX: client.x,
      clientY: client.y,
      preventDefault: () => {},
    },
  } as never;
}

/**
 * Move the pointer, the way the window reports it during a drag.
 * @param client - Where the pointer went
 * @returns Nothing
 */
function moveMouse(client: { x: number; y: number }) {
  fireEvent.mouseMove(window, { clientX: client.x, clientY: client.y });
}

describe("useStageZoom", () => {
  it("starts at the fit scale", () => {
    const { result } = renderTacticHook(() => useStageZoom(WIDTH));

    expect(result.current.zoom).toEqual({ zoom: 1, offset: { x: 0, y: 0 } });
  });

  it("zooms in on a wheel notch up and out on one down", () => {
    const { result } = renderTacticHook(() => useStageZoom(WIDTH));

    act(() => result.current.onWheel(wheelEvent(-1)));
    expect(result.current.zoom.zoom).toBeCloseTo(ZOOM_STEP);

    act(() => result.current.onWheel(wheelEvent(1)));
    expect(result.current.zoom.zoom).toBeCloseTo(1);
  });

  it("ignores a wheel event with no pointer on the stage", () => {
    const { result } = renderTacticHook(() => useStageZoom(WIDTH));

    act(() =>
      result.current.onWheel({
        evt: { deltaY: -1, preventDefault: () => {} },
        target: { getStage: () => ({ getPointerPosition: () => null }) },
      } as never)
    );

    expect(result.current.zoom.zoom).toBe(1);
  });

  it("stops at both ends of the range", () => {
    const { result } = renderTacticHook(() => useStageZoom(WIDTH));

    for (let step = 0; step < 40; step += 1) {
      act(() => result.current.onWheel(wheelEvent(-1)));
    }
    expect(result.current.zoom.zoom).toBe(ZOOM_MAX);

    for (let step = 0; step < 60; step += 1) {
      act(() => result.current.onWheel(wheelEvent(1)));
    }
    expect(result.current.zoom.zoom).toBe(ZOOM_MIN);
  });

  it("holds the map in the middle of the canvas once it is zoomed out", () => {
    const { result } = renderTacticHook(() => useStageZoom(WIDTH));

    for (let step = 0; step < 60; step += 1) {
      act(() => result.current.onWheel(wheelEvent(1)));
    }

    expect(result.current.zoom.offset.x).toBeCloseTo(
      (VIEWPORT.width - VIEWPORT.width * ZOOM_MIN) / 2
    );
  });

  it("pans with the middle button and ignores the others", () => {
    const { result } = renderTacticHook(() => useStageZoom(WIDTH));

    // Zoomed in, so the map is larger than the canvas and has room to move.
    act(() => result.current.step(1));
    act(() => result.current.step(1));
    const before = result.current.zoom.offset;

    act(() => result.current.onPanStart(mouseEvent(0, { x: 10, y: 10 })));
    act(() => moveMouse({ x: 40, y: 30 }));
    expect(result.current.panning).toBe(false);
    expect(result.current.zoom.offset).toEqual(before);

    act(() => result.current.onPanStart(mouseEvent(1, { x: 10, y: 10 })));
    expect(result.current.panning).toBe(true);
    act(() => moveMouse({ x: 20, y: 25 }));
    expect(result.current.zoom.offset).toEqual({
      x: before.x + 10,
      y: before.y + 15,
    });
  });

  it("keeps following a drag that left the canvas, and ends it on the mouse-up", () => {
    const { result } = renderTacticHook(() => useStageZoom(WIDTH));

    act(() => result.current.step(1));
    act(() => result.current.step(1));
    act(() => result.current.onPanStart(mouseEvent(1, { x: 100, y: 100 })));
    act(() => moveMouse({ x: 90, y: 90 }));
    const moved = result.current.zoom.offset;

    act(() => fireEvent.mouseUp(window));
    expect(result.current.panning).toBe(false);

    act(() => moveMouse({ x: 10, y: 10 }));
    expect(result.current.zoom.offset).toEqual(moved);
  });

  it("steps and resets from the buttons", () => {
    const { result } = renderTacticHook(() => useStageZoom(WIDTH));

    act(() => result.current.step(1));
    expect(result.current.zoom.zoom).toBeCloseTo(ZOOM_STEP);

    act(() => result.current.step(-1));
    expect(result.current.zoom.zoom).toBeCloseTo(1);

    act(() => result.current.step(1));
    act(() => result.current.reset());
    expect(result.current.zoom).toEqual({ zoom: 1, offset: { x: 0, y: 0 } });
  });
});
