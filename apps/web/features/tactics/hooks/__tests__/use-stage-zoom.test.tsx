// @vitest-environment jsdom
import { act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TACTIC_MAP_WIDTH } from "@guild/shared/schemas";

import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from "../../lib/zoom";
import { useStageZoom } from "../use-stage-zoom";
import { renderTacticHook } from "./render-tactic-hook";

/** The canvas width every test zooms inside: half the map, so the fit scale is 0.5. */
const WIDTH = TACTIC_MAP_WIDTH / 2;

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
 * A mouse event as Konva reports it.
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

  it("pans with the middle button and ignores the others", () => {
    const { result } = renderTacticHook(() => useStageZoom(WIDTH));

    act(() => result.current.onPanStart(mouseEvent(0, { x: 10, y: 10 })));
    act(() => result.current.onPanMove(mouseEvent(0, { x: 40, y: 30 })));
    expect(result.current.zoom.offset).toEqual({ x: 0, y: 0 });

    act(() => result.current.onPanStart(mouseEvent(1, { x: 10, y: 10 })));
    act(() => result.current.onPanMove(mouseEvent(1, { x: 40, y: 30 })));
    expect(result.current.zoom.offset).toEqual({ x: 30, y: 20 });

    act(() => result.current.onPanEnd());
    act(() => result.current.onPanMove(mouseEvent(1, { x: 100, y: 100 })));
    expect(result.current.zoom.offset).toEqual({ x: 30, y: 20 });
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
