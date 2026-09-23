import type { ElementBounds } from "./element-geometry";
import type { StageViewport } from "./stage-scale";
import type { ZoomState } from "./zoom";

/**
 * How wide the action bar is, in CSS pixels. Its contents are fixed — three size buttons and the
 * delete one — so the number is known well enough to keep the bar off the canvas edges; it is only
 * ever used for that clamp, never as a width the bar is rendered at.
 */
export const SELECTION_ACTIONS_WIDTH = 200;

/** How tall the action bar is, in CSS pixels. Used to decide whether it still fits underneath. */
export const SELECTION_ACTIONS_HEIGHT = 36;

/** Gap between the element and the bar, in CSS pixels. */
const ACTIONS_GAP = 8;

/** How close to the canvas edge the bar may sit, in CSS pixels. */
const EDGE_MARGIN = 4;

/** Where the action bar is drawn, in CSS pixels inside the canvas box. */
export interface SelectionPlacement {
  /** Middle of the bar along the x axis */
  left: number;
  /** The edge of the bar the element is on: its top when below, its bottom when above */
  top: number;
  /** Whether the bar hangs above the element instead of under it */
  above: boolean;
}

/**
 * Where the action bar sits for a selected element, or nothing when the element is not on screen.
 *
 * The bar is a DOM overlay over a canvas the zoom moves underneath it, so everything here is the
 * same map-to-canvas transform the stage draws with: scale by the fit scale times the zoom, then
 * add the pan offset.
 * @param bounds - What the element covers, in map units
 * @param viewport - The canvas the map is drawn into
 * @param zoom - How far the map is zoomed in and how far it has been pushed
 * @returns The placement, or null while a pan has taken the element off the canvas
 */
export function selectionPlacement(
  // Only the vertical edges and the middle: the bar is centred on the element, never aligned to a side.
  bounds: Pick<ElementBounds, "centerX" | "top" | "bottom">,
  viewport: StageViewport,
  zoom: ZoomState
): SelectionPlacement | null {
  const scale = viewport.fitScale * zoom.zoom;
  const centerX = bounds.centerX * scale + zoom.offset.x;
  const top = bounds.top * scale + zoom.offset.y;
  const bottom = bounds.bottom * scale + zoom.offset.y;

  const isOnCanvas =
    centerX >= 0 &&
    centerX <= viewport.width &&
    bottom >= 0 &&
    top <= viewport.height;

  if (!isOnCanvas) {
    return null;
  }

  const above =
    bottom + ACTIONS_GAP + SELECTION_ACTIONS_HEIGHT > viewport.height;

  return {
    left: clampLeft(centerX, viewport.width),
    top: above ? top - ACTIONS_GAP : bottom + ACTIONS_GAP,
    above,
  };
}

/**
 * Keep the bar's middle far enough from either edge that the whole bar stays on the canvas.
 * @param centerX - Where the element's middle is, in canvas pixels
 * @param viewWidth - Width of the canvas, in canvas pixels
 * @returns Where the bar's middle is drawn
 */
function clampLeft(centerX: number, viewWidth: number): number {
  const half = SELECTION_ACTIONS_WIDTH / 2;
  const min = half + EDGE_MARGIN;
  const max = viewWidth - half - EDGE_MARGIN;

  // A canvas narrower than the bar has no room to clamp inside: the middle is the least bad place.
  return min > max ? viewWidth / 2 : Math.min(max, Math.max(min, centerX));
}
