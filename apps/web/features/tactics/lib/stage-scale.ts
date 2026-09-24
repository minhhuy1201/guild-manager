import {
  TACTIC_MAP_HEIGHT,
  TACTIC_MAP_WIDTH,
} from "@guild/shared/schemas";

import type { MapPoint } from "./element-geometry";
import type { ZoomState } from "./zoom";

/**
 * Narrowest stage the scale is computed from. A container measured before layout reports 0, and a
 * scale of 0 makes Konva draw nothing at all — this keeps the first frame visible.
 */
const MIN_STAGE_WIDTH = 320;

/**
 * Scale factor between virtual map space and the stage on screen.
 * One factor for both axes is what makes a tactic drawn on a 27-inch screen line up on a 13-inch
 * one, and an export line up at any pixel ratio.
 * @param stageWidth - Width the stage is rendered at, in CSS pixels
 * @returns The factor to give Konva's `scaleX` and `scaleY`
 */
export function stageScale(stageWidth: number): number {
  return Math.max(stageWidth, MIN_STAGE_WIDTH) / TACTIC_MAP_WIDTH;
}

/**
 * Convert a pointer position on the stage back into map coordinates.
 * @param pointer - Pointer position as Konva reports it, in stage pixels
 * @param scale - The factor `stageScale` returned
 * @returns The point in virtual map space
 */
export function toMapPoint(pointer: MapPoint, scale: number): MapPoint {
  return { x: pointer.x / scale, y: pointer.y / scale };
}

/**
 * Convert a point on the canvas back into map coordinates, through the pan and the zoom.
 * The one formula both the Konva stage's pointer and a palette token dropped from the DOM go
 * through, so the two cannot land a token in different places.
 * @param pointer - Point relative to the canvas's top-left corner, in CSS pixels
 * @param zoom - How far the map is zoomed in and how far it has been pushed
 * @param fitScale - Scale at which the map exactly fits the canvas
 * @returns The point in virtual map space
 */
export function canvasToMapPoint(
  pointer: MapPoint,
  zoom: ZoomState,
  fitScale: number
): MapPoint {
  return toMapPoint(
    { x: pointer.x - zoom.offset.x, y: pointer.y - zoom.offset.y },
    fitScale * zoom.zoom
  );
}

/** The canvas the map is drawn into: its size on screen and the scale the map fits it at. */
export interface StageViewport {
  /** Width of the canvas, in CSS pixels */
  width: number;
  /** Height of the canvas, in CSS pixels */
  height: number;
  /** Scale at which the map exactly fits the canvas */
  fitScale: number;
}

/**
 * The canvas the map is drawn into, derived from the one width the editor measures.
 * The height is never measured: it follows the map's aspect ratio, which is what keeps a tactic
 * lined up across screens.
 * @param stageWidth - Width the stage is rendered at, in CSS pixels
 * @returns The viewport the zoom keeps the map balanced inside
 */
export function stageViewport(stageWidth: number): StageViewport {
  const fitScale = stageScale(stageWidth);

  return {
    width: stageWidth,
    height: TACTIC_MAP_HEIGHT * fitScale,
    fitScale,
  };
}
