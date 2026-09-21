/**
 * Drawing colours offered by the toolbar, in the order the toolbar shows them: blue first, because
 * it is what a fresh editor draws with. Stored as keys, not hex: re-theming must not rewrite data.
 */
export const TACTIC_COLORS = ["blue", "red", "yellow", "black"] as const;

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
 * Icon keys drawn from `lucide`. The web maps each one to a component and, for the canvas, to the
 * flattened artwork in `icon-paths.ts`.
 */
export const TACTIC_LUCIDE_ICONS = [
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

/** One of the icon keys backed by lucide artwork. */
export type TacticLucideIcon = (typeof TACTIC_LUCIDE_ICONS)[number];

/**
 * Icon keys that are a digit rather than a drawing — one per numbered team, so "Đội 3" reads as a
 * "3" on the map and in the palette instead of the same crowd icon as every other team.
 * Lucide has no digit artwork, so the web draws these as text; `icon-paths.ts` deliberately does
 * not cover them.
 */
export const TACTIC_NUMBER_ICONS = [
  "number-1",
  "number-2",
  "number-3",
  "number-4",
  "number-5",
  "number-6",
  "number-7",
  "number-8",
  "number-9",
  "number-10",
] as const;

/** One of the digit icon keys. */
export type TacticNumberIcon = (typeof TACTIC_NUMBER_ICONS)[number];

/**
 * Icon keys a token may carry. Keys, not free-form icon names: the web maps each one to artwork,
 * so an unknown key can never reach the canvas.
 */
export const TACTIC_TOKEN_ICONS = [
  ...TACTIC_LUCIDE_ICONS,
  ...TACTIC_NUMBER_ICONS,
] as const;

/** One of the allowed token icon keys. */
export type TacticTokenIcon = (typeof TACTIC_TOKEN_ICONS)[number];

/**
 * Whether an icon key is a digit rather than lucide artwork.
 * @param icon - The icon key stored on a token
 * @returns True when the key is one of TACTIC_NUMBER_ICONS
 */
export function isNumberIcon(icon: TacticTokenIcon): icon is TacticNumberIcon {
  return (TACTIC_NUMBER_ICONS as readonly string[]).includes(icon);
}

/**
 * The digit a number icon draws.
 * @param icon - One of TACTIC_NUMBER_ICONS
 * @returns The digits after the `number-` prefix, e.g. "10"
 */
export function numberIconDigits(icon: TacticNumberIcon): string {
  return icon.slice("number-".length);
}
