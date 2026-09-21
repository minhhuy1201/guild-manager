import { TACTIC_MAP_WIDTH } from "@guild/shared/schemas";

import type { MapPoint } from "./hit-test";

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
