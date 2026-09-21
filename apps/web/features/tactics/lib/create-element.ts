import type { TacticColor, TacticStrokeWidth } from "@guild/shared/enums";
import {
  TACTIC_LIMITS,
  type TacticArrow,
  type TacticFreehand,
  type TacticText,
  type TacticToken,
} from "@guild/shared/schemas";

import type { BuiltInToken } from "./built-in-tokens";
import type { MapPoint } from "./hit-test";
import { newId } from "./scene";

/** Font size a new note takes, in virtual map units. */
export const DEFAULT_FONT_SIZE = 28;

/**
 * Put a token from the palette onto the map.
 * The token captures the palette entry's label and icon: it does not point back at it, so renaming
 * or deleting a preset never changes a tactic already drawn.
 * @param source - The palette entry being dragged out
 * @param point - Where it lands, in virtual map units
 * @param color - Colour picked on the toolbar
 * @returns The new token
 */
export function createToken(
  source: BuiltInToken,
  point: MapPoint,
  color: TacticColor
): TacticToken {
  return {
    kind: "token",
    id: newId(),
    label: source.label,
    icon: source.icon,
    x: point.x,
    y: point.y,
    size: "md",
    color,
  };
}

/**
 * Begin an arrow. Head and tail start together and the head follows the pointer until it is let go.
 * @param point - Where the drag started, in virtual map units
 * @param color - Colour picked on the toolbar
 * @param strokeWidth - Width picked on the toolbar
 * @returns The new arrow
 */
export function createArrow(
  point: MapPoint,
  color: TacticColor,
  strokeWidth: TacticStrokeWidth
): TacticArrow {
  return {
    kind: "arrow",
    id: newId(),
    points: [point.x, point.y, point.x, point.y],
    color,
    strokeWidth,
  };
}

/**
 * Move an arrow's head, leaving its tail where the drag began.
 * @param arrow - The arrow being drawn
 * @param point - Current pointer position, in virtual map units
 * @returns A new arrow pointing at that position
 */
export function pointArrow(arrow: TacticArrow, point: MapPoint): TacticArrow {
  return {
    ...arrow,
    points: [arrow.points[0], arrow.points[1], point.x, point.y],
  };
}

/**
 * Begin a freehand stroke. The first point is stored twice so a single click still leaves a dot
 * rather than an empty stroke Zod would reject.
 * @param point - Where the drag started, in virtual map units
 * @param color - Colour picked on the toolbar
 * @param strokeWidth - Width picked on the toolbar
 * @returns The new stroke
 */
export function createFreehand(
  point: MapPoint,
  color: TacticColor,
  strokeWidth: TacticStrokeWidth
): TacticFreehand {
  return {
    kind: "freehand",
    id: newId(),
    points: [point.x, point.y, point.x, point.y],
    color,
    strokeWidth,
  };
}

/**
 * Add a point to a freehand stroke.
 * A stroke at the contract's ceiling stops growing instead of growing into a save the API would
 * reject with the whole drawing attached.
 * @param stroke - The stroke being drawn
 * @param point - Current pointer position, in virtual map units
 * @returns A new stroke, unchanged once it is full
 */
export function extendFreehand(
  stroke: TacticFreehand,
  point: MapPoint
): TacticFreehand {
  if (stroke.points.length >= TACTIC_LIMITS.pointsPerStroke * 2) {
    return stroke;
  }

  return { ...stroke, points: [...stroke.points, point.x, point.y] };
}

/**
 * Write a note on the map.
 * @param point - Where it goes, in virtual map units
 * @param text - What it says
 * @param color - Colour picked on the toolbar
 * @returns The new note
 */
export function createText(
  point: MapPoint,
  text: string,
  color: TacticColor
): TacticText {
  return {
    kind: "text",
    id: newId(),
    x: point.x,
    y: point.y,
    text,
    color,
    fontSize: DEFAULT_FONT_SIZE,
  };
}
