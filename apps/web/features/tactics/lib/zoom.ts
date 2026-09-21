import type { MapPoint } from "./hit-test";

/** Smallest zoom the map may be shown at: the whole map at half the width it fits at. */
export const ZOOM_MIN = 0.5;

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
 * Zoom around a point of the canvas, so whatever sits under the pointer stays under it.
 * @param state - Where the map sits now
 * @param pointer - Pointer position in canvas pixels
 * @param factor - What to multiply the zoom by; below 1 zooms out
 * @param fitScale - The scale at which the map exactly fits the canvas
 * @returns Where the map sits after the zoom
 */
export function zoomAt(
  state: ZoomState,
  pointer: MapPoint,
  factor: number,
  fitScale: number
): ZoomState {
  const zoom = clampZoom(state.zoom * factor);

  // Nothing to recentre when the zoom did not move (it was already at a limit).
  if (zoom === state.zoom) {
    return state;
  }

  const scale = fitScale * state.zoom;
  const nextScale = fitScale * zoom;
  // The map point the pointer is over, before and after: the offset absorbs the difference.
  const mapX = (pointer.x - state.offset.x) / scale;
  const mapY = (pointer.y - state.offset.y) / scale;

  return {
    zoom,
    offset: {
      x: pointer.x - mapX * nextScale,
      y: pointer.y - mapY * nextScale,
    },
  };
}

/**
 * Move the map by a drag.
 * @param state - Where the map sits now
 * @param deltaX - How far the pointer moved horizontally, in canvas pixels
 * @param deltaY - How far the pointer moved vertically, in canvas pixels
 * @returns Where the map sits after the move
 */
export function panBy(
  state: ZoomState,
  deltaX: number,
  deltaY: number
): ZoomState {
  return {
    ...state,
    offset: { x: state.offset.x + deltaX, y: state.offset.y + deltaY },
  };
}

/**
 * The zoom as the readout shows it.
 * @param zoom - The current zoom
 * @returns A percentage, e.g. "150%"
 */
export function zoomLabel(zoom: number): string {
  return `${Math.round(zoom * 100)}%`;
}
