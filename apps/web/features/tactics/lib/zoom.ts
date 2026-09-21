import { TACTIC_MAP_HEIGHT, TACTIC_MAP_WIDTH } from "@guild/shared/schemas";

import type { MapPoint } from "./hit-test";
import type { StageViewport } from "./stage-scale";

/**
 * Smallest zoom the map may be shown at. Below this the map is a stamp in the middle of a large
 * empty canvas, which reads as a bug rather than as a view.
 */
export const ZOOM_MIN = 0.87;

/** Largest zoom the map may be shown at. */
export const ZOOM_MAX = 4;

/** How much one wheel notch changes the zoom. */
export const ZOOM_STEP = 1.15;

/** Zoom 1 means "the map exactly fits the canvas", whatever the canvas is wide. */
export const ZOOM_FIT = 1;

/** How the map sits inside the canvas: how far in, and how far it has been pushed. */
export interface ZoomState {
  /** Multiplier on top of the fit scale */
  zoom: number;
  /** Offset of the map inside the canvas, in canvas pixels */
  offset: MapPoint;
}

/** The map filling the canvas, unmoved. */
export const INITIAL_ZOOM: ZoomState = { zoom: ZOOM_FIT, offset: { x: 0, y: 0 } };

/**
 * Keep a zoom inside the allowed range.
 * @param zoom - The zoom being applied
 * @returns The zoom, clamped
 */
export function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

/**
 * Where the map may sit along one axis, given how much of it there is and how much room.
 *
 * Zoomed in, the map is larger than the canvas and may be dragged, but only as far as its own
 * edges — no strip of empty canvas beside it. Zoomed out it is smaller than the canvas and has
 * exactly one place to be: the middle.
 * @param offset - Offset the drag or the zoom asked for
 * @param mapSize - How long the map is on this axis, in canvas pixels
 * @param viewSize - How long the canvas is on this axis, in canvas pixels
 * @returns The offset the map is actually drawn at
 */
function clampAxis(offset: number, mapSize: number, viewSize: number): number {
  const slack = viewSize - mapSize;

  return slack >= 0 ? slack / 2 : Math.min(0, Math.max(slack, offset));
}

/**
 * Keep the map balanced in the canvas: centred while it is smaller, gapless while it is larger.
 * @param state - Where the map wants to sit
 * @param viewport - The canvas the map is drawn into
 * @returns The same zoom, at an offset the canvas allows
 */
export function clampOffset(
  state: ZoomState,
  viewport: StageViewport
): ZoomState {
  const scale = viewport.fitScale * state.zoom;

  return {
    zoom: state.zoom,
    offset: {
      x: clampAxis(state.offset.x, TACTIC_MAP_WIDTH * scale, viewport.width),
      y: clampAxis(state.offset.y, TACTIC_MAP_HEIGHT * scale, viewport.height),
    },
  };
}

/**
 * Zoom around a point of the canvas, so whatever sits under the pointer stays under it.
 * @param state - Where the map sits now
 * @param pointer - Pointer position in canvas pixels
 * @param factor - What to multiply the zoom by; below 1 zooms out
 * @param viewport - The canvas the map is drawn into
 * @returns Where the map sits after the zoom
 */
export function zoomAt(
  state: ZoomState,
  pointer: MapPoint,
  factor: number,
  viewport: StageViewport
): ZoomState {
  const zoom = clampZoom(state.zoom * factor);

  // Nothing to recentre when the zoom did not move (it was already at a limit).
  if (zoom === state.zoom) {
    return state;
  }

  const scale = viewport.fitScale * state.zoom;
  const nextScale = viewport.fitScale * zoom;
  // The map point the pointer is over, before and after: the offset absorbs the difference.
  const mapX = (pointer.x - state.offset.x) / scale;
  const mapY = (pointer.y - state.offset.y) / scale;

  return clampOffset(
    {
      zoom,
      offset: {
        x: pointer.x - mapX * nextScale,
        y: pointer.y - mapY * nextScale,
      },
    },
    viewport
  );
}

/**
 * Move the map by a drag, as far as the canvas allows.
 * @param state - Where the map sits now
 * @param deltaX - How far the pointer moved horizontally, in canvas pixels
 * @param deltaY - How far the pointer moved vertically, in canvas pixels
 * @param viewport - The canvas the map is drawn into
 * @returns Where the map sits after the move
 */
export function panBy(
  state: ZoomState,
  deltaX: number,
  deltaY: number,
  viewport: StageViewport
): ZoomState {
  return clampOffset(
    {
      ...state,
      offset: { x: state.offset.x + deltaX, y: state.offset.y + deltaY },
    },
    viewport
  );
}

/**
 * The zoom as the readout shows it.
 * @param zoom - The current zoom
 * @returns A percentage, e.g. "150%"
 */
export function zoomLabel(zoom: number): string {
  return `${Math.round(zoom * 100)}%`;
}
