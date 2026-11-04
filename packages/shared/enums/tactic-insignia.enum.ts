/**
 * Stable key of each tactic Insignia ("Quân hiệu"), in palette order. The key, not the display
 * name, identifies an Insignia: the name is what a guild may rename.
 */
export const TACTIC_INSIGNIA_KEYS = [
  "attack",
  "defense",
  "mobile",
  "scout",
  "rally",
  "tower",
  "escort",
] as const;

/** One of the seven Insignia keys. */
export type TacticInsigniaKey = (typeof TACTIC_INSIGNIA_KEYS)[number];
