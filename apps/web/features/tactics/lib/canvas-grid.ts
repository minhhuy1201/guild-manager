import type { CSSProperties } from "react";

/** Spacing of the fine grid behind the map, in CSS pixels. */
const CELL = 24;

/** How many fine cells make one heavier division, the way a drafting sheet marks its major lines. */
const CELLS_PER_BLOCK = 4;

/** Colour of a fine line: the theme's border, thinned so the map stays the loudest thing. */
const LINE = "color-mix(in oklch, var(--border), transparent 35%)";

/** Colour of a block line. */
const BLOCK_LINE = "color-mix(in oklch, var(--border), transparent 10%)";

/**
 * A line of `colour`, one pixel wide, repeated by the background size.
 * @param direction - Which way the gradient runs, so the line comes out vertical or horizontal
 * @param colour - What the line is painted in
 * @returns One `linear-gradient` layer
 */
function line(direction: "to right" | "to bottom", colour: string): string {
  return `linear-gradient(${direction}, ${colour} 1px, transparent 1px)`;
}

/**
 * The grid the map sits on: graph paper, visible around the map once it is zoomed out or pushed
 * aside, so the empty canvas reads as a board rather than as a hole.
 *
 * It is a CSS background of the canvas container, not shapes on the Konva stage — nothing here
 * belongs in an exported image, and a background costs no frame time while drawing.
 */
export const CANVAS_GRID_STYLE: CSSProperties = {
  backgroundImage: [
    line("to right", BLOCK_LINE),
    line("to bottom", BLOCK_LINE),
    line("to right", LINE),
    line("to bottom", LINE),
  ].join(", "),
  backgroundSize: [
    `${CELL * CELLS_PER_BLOCK}px ${CELL * CELLS_PER_BLOCK}px`,
    `${CELL * CELLS_PER_BLOCK}px ${CELL * CELLS_PER_BLOCK}px`,
    `${CELL}px ${CELL}px`,
    `${CELL}px ${CELL}px`,
  ].join(", "),
};
