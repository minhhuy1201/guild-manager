/** Font families the canvas writes with. */
export interface StageFonts {
  /** The page's body family, read once from the computed style */
  readonly body: string;
  /** The stage's display family (Bungee), the real name `next/font` gave it */
  readonly display: string;
}

/**
 * A canvas font string for body text.
 * @param px - Size in px
 * @param weight - CSS weight
 * @param fonts - The stage fonts
 * @returns The value for `context.font`
 */
export function bodyFont(px: number, weight: number, fonts: StageFonts): string {
  return `${weight} ${px}px ${fonts.body}`;
}

/**
 * A canvas font string for the stage lettering.
 * @param px - Size in px
 * @param fonts - The stage fonts
 * @returns The value for `context.font`
 */
export function displayFont(px: number, fonts: StageFonts): string {
  return `${px}px ${fonts.display}`;
}

/** Lettering painted in the display font; the canvas asks for these glyphs before the first paint. */
export const GATE_TEXT = "ĐÍCH";
export const TITLE_TEXT = "ĐUA MÈO";
