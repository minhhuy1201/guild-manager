import { assertNever } from "@guild/shared/lib";
import type { TacticElement, TacticStage } from "@guild/shared/schemas";

import { TOKEN_RADIUS } from "./token-icon";

/** A point in virtual map space. */
export interface MapPoint {
  /** Distance from the map's left edge, in virtual map units */
  x: number;
  /** Distance from the map's top edge, in virtual map units */
  y: number;
}

/**
 * Smallest distance, in map units, that still counts as touching a stroke. A 2-unit line would be
 * impossible to hit otherwise, so the eraser reaches a little further than the ink is wide.
 */
const MIN_STROKE_HIT_WIDTH = 16;

/** How wide one character of a note is, relative to its font size. */
const TEXT_WIDTH_RATIO = 0.6;

/**
 * Find the element under a pointer.
 * Walks from the last element to the first, so the one drawn on top is the one erased.
 * @param stage - The stage being drawn on
 * @param point - Pointer position, in virtual map units
 * @returns Id of the element under the pointer, or null when there is none
 */
export function hitTest(stage: TacticStage, point: MapPoint): string | null {
  for (let index = stage.elements.length - 1; index >= 0; index -= 1) {
    const element = stage.elements[index];

    if (isHit(element, point)) {
      return element.id;
    }
  }

  return null;
}

/**
 * Whether one element covers a point.
 * @param element - The element to test
 * @param point - Pointer position, in virtual map units
 * @returns True when the pointer is on it
 */
function isHit(element: TacticElement, point: MapPoint): boolean {
  switch (element.kind) {
    case "token":
      return (
        distance(point, element) <= TOKEN_RADIUS[element.size]
      );
    case "arrow":
    case "freehand":
      return isOnPolyline(
        element.points,
        point,
        Math.max(element.strokeWidth, MIN_STROKE_HIT_WIDTH) / 2
      );
    case "text": {
      const width = element.text.length * element.fontSize * TEXT_WIDTH_RATIO;

      return (
        point.x >= element.x &&
        point.x <= element.x + width &&
        point.y >= element.y &&
        point.y <= element.y + element.fontSize
      );
    }
    default:
      return assertNever(element);
  }
}

/**
 * Distance between two points.
 * @param a - First point
 * @param b - Second point
 * @returns The distance in map units
 */
function distance(a: MapPoint, b: MapPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Whether a point lies within `tolerance` of a flat [x, y, x, y, …] polyline.
 * @param points - The polyline's flat coordinates
 * @param point - The point to test
 * @param tolerance - How far off the line still counts as a hit, in map units
 * @returns True when the point is close enough to any segment
 */
function isOnPolyline(
  points: number[],
  point: MapPoint,
  tolerance: number
): boolean {
  for (let index = 0; index + 3 < points.length; index += 2) {
    const start = { x: points[index], y: points[index + 1] };
    const end = { x: points[index + 2], y: points[index + 3] };

    if (distanceToSegment(point, start, end) <= tolerance) {
      return true;
    }
  }

  return false;
}

/**
 * Shortest distance from a point to a line segment.
 * @param point - The point
 * @param start - Where the segment begins
 * @param end - Where the segment ends
 * @returns The distance in map units
 */
function distanceToSegment(
  point: MapPoint,
  start: MapPoint,
  end: MapPoint
): number {
  const lengthSquared = (end.x - start.x) ** 2 + (end.y - start.y) ** 2;

  if (lengthSquared === 0) {
    return distance(point, start);
  }

  const position =
    ((point.x - start.x) * (end.x - start.x) +
      (point.y - start.y) * (end.y - start.y)) /
    lengthSquared;
  const clamped = Math.min(1, Math.max(0, position));

  return distance(point, {
    x: start.x + clamped * (end.x - start.x),
    y: start.y + clamped * (end.y - start.y),
  });
}
