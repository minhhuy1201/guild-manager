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

/**
 * Colors of each team, keyed by team number. Add or edit an entry to recolor a
 * team; teams left out fall back to DEFAULT_TEAM_COLORS.
 *
 * Every value is set by hand rather than derived from the header, so a column
 * can be tuned on its own. Classes must be written as complete literals -
 * Tailwind scans source text, so a composed string like `bg-${x}-500` produces
 * no CSS.
 */
const TEAM_COLORS: Record<number, TeamColors> = {
  1: {
    header: "bg-blue-200 text-black",
    border: "border-blue-300",
    background: "bg-blue-50",
  },
  2: {
    header: "bg-blue-200 text-black",
    border: "border-blue-300",
    background: "bg-blue-50",
  },
  3: {
    header: "bg-blue-200 text-black",
    border: "border-blue-300",
    background: "bg-blue-50",
  },
  4: {
    header: "bg-blue-200 text-black",
    border: "border-blue-300",
    background: "bg-blue-50",
  },
  5: {
    header: "bg-blue-200 text-black",
    border: "border-blue-300",
    background: "bg-blue-50",
  },
  6: {
    header: "bg-lime-400 text-black",
    border: "border-lime-500",
    background: "bg-lime-100",
  },
  7: {
    header: "bg-lime-400 text-black",
    border: "border-lime-500",
    background: "bg-lime-100",
  },
  8: {
    header: "bg-blue-300 text-black",
    border: "border-blue-400",
    background: "bg-blue-100",
  },
  9: {
    header: "bg-yellow-400 text-black",
    border: "border-yellow-500",
    background: "bg-yellow-100",
  },
  10: {
    header: "bg-yellow-400 text-black",
    border: "border-yellow-500",
    background: "bg-yellow-100",
  },
};

/**
 * Resolves the classes a team's column renders with.
 * @param team - Team number as shown in the header
 * @returns The team's header, border and background classes, or the default when it has none
 */
export function getTeamColors(team: number): TeamColors {
  return TEAM_COLORS[team] ?? DEFAULT_TEAM_COLORS;
}
