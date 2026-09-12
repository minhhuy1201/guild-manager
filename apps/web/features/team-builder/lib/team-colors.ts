/** Classes one team renders with, each written out as a complete Tailwind literal. */
interface TeamColors {
  /** Header surface and its text */
  header: string;
  /** Column border color, a shade darker than the header */
  border: string;
  /** Column surface, a shade lighter than the header */
  background: string;
}

/**
 * Fallback used by any team missing from TEAM_COLORS - the original look: a
 * primary header on the plain card. Edit here to change every unstyled team at once.
 */
const DEFAULT_TEAM_COLORS: TeamColors = {
  header: "bg-primary text-primary-foreground",
  border: "border-border",
  background: "bg-card",
};

/*
 * The four groups the guild splits its ten teams into, each a quiet tint of one colour the palette
 * already owns - jade, the warm neutral, navy, gold - so the grid reads as grouped without adding a
 * hue of its own. Text stays `foreground` on every header: the tints are too light to need inverting.
 */
const JADE: TeamColors = {
  header: "bg-jade/20 text-foreground",
  border: "border-jade/40",
  background: "bg-jade/5",
};

const STONE: TeamColors = {
  header: "bg-foreground/10 text-foreground",
  border: "border-foreground/20",
  background: "bg-foreground/[0.03]",
};

const NAVY: TeamColors = {
  header: "bg-primary/15 text-foreground",
  border: "border-primary/30",
  background: "bg-primary/5",
};

const GOLD: TeamColors = {
  header: "bg-gold/30 text-foreground",
  border: "border-gold/60",
  background: "bg-gold/10",
};

/**
 * Colors of each team, keyed by team number. Add or edit an entry to recolor a
 * team; teams left out fall back to DEFAULT_TEAM_COLORS.
 *
 * Classes must be written as complete literals - Tailwind scans source text,
 * so a composed string like `bg-${x}-500` produces no CSS.
 */
const TEAM_COLORS: Record<number, TeamColors> = {
  1: JADE,
  2: JADE,
  3: JADE,
  4: JADE,
  5: JADE,
  6: STONE,
  7: STONE,
  8: NAVY,
  9: GOLD,
  10: GOLD,
};

/**
 * Resolves the classes a team's column renders with.
 * @param team - Team number as shown in the header
 * @returns The team's header, border and background classes, or the default when it has none
 */
export function getTeamColors(team: number): TeamColors {
  return TEAM_COLORS[team] ?? DEFAULT_TEAM_COLORS;
}
