/** Drawing colours offered by the toolbar. Stored as keys, not hex: re-theming must not rewrite data. */
export const TACTIC_COLORS = ["red", "blue", "yellow", "white"] as const;

/** One of the four drawing colours. */
export type TacticColor = (typeof TACTIC_COLORS)[number];

/** Stroke widths offered by the toolbar, in virtual map units (1920x1071 space). */
export const TACTIC_STROKE_WIDTHS = [2, 4, 8, 14] as const;

/** One of the four stroke widths. */
export type TacticStrokeWidth = (typeof TACTIC_STROKE_WIDTHS)[number];

/** Token sizes. A token is resized by picking one of these, never by a free transform handle. */
export const TACTIC_TOKEN_SIZES = ["sm", "md", "lg"] as const;

/** One of the three token sizes. */
export type TacticTokenSize = (typeof TACTIC_TOKEN_SIZES)[number];

/**
 * Icon keys a token may carry. Keys, not free-form icon names: the web maps each one to a
 * `lucide-react` component, so an unknown key can never reach the canvas.
 */
export const TACTIC_TOKEN_ICONS = [
  "swords",
  "shield",
  "flag",
  "crosshair",
  "footprints",
  "eye",
  "target",
  "castle",
  "tent",
  "anchor",
  "bomb",
  "crown",
  "flame",
  "gem",
  "heart",
  "map-pin",
  "skull",
  "star",
  "truck",
  "users",
] as const;

/** One of the allowed token icon keys. */
export type TacticTokenIcon = (typeof TACTIC_TOKEN_ICONS)[number];
