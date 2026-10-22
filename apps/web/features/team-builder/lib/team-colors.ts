import { teamColorGroup, type TeamColorGroup } from "@/lib/team-color-group";

/** Classes one team renders with, each written out as a complete Tailwind literal. */
interface TeamColors {
  /** Header surface and its text */
  header: string;
  /** Column border color, quiet so the accent bar carries the colour */
  border: string;
  /** Column surface */
  background: string;
  /** The bar across the top of the column, the team colour at full strength */
  accent: string;
}

/**
 * Fallback used by any team no colour group covers - the original look: a
 * primary header on the plain card. Edit here to change every unstyled team at once.
 */
const DEFAULT_TEAM_COLORS: TeamColors = {
  header: "bg-primary/15 text-foreground",
  border: "border-border",
  background: "bg-card",
  accent: "bg-primary",
};

/*
 * Each colour group is an accent: a full-strength bar across the top and a faint wash in the header,
 * over the plain card. The body stays neutral so ten tinted columns do not compete with the member
 * cards, which carry their own class colour. Text stays `foreground` on every header.
 */
const JADE: TeamColors = {
  header: "bg-jade/15 text-foreground",
  border: "border-jade/35",
  background: "bg-card",
  accent: "bg-jade",
};

const STONE: TeamColors = {
  header: "bg-foreground/[0.08] text-foreground",
  border: "border-foreground/20",
  background: "bg-card",
  accent: "bg-foreground/45",
};

const NAVY: TeamColors = {
  header: "bg-primary/15 text-foreground",
  border: "border-primary/35",
  background: "bg-card",
  accent: "bg-primary",
};

const GOLD: TeamColors = {
  header: "bg-gold/20 text-foreground",
  border: "border-gold/45",
  background: "bg-card",
  accent: "bg-gold",
};

/**
 * Classes of each colour group. Which team sits in which group lives in `teamColorGroup`.
 *
 * Classes must be written as complete literals - Tailwind scans source text,
 * so a composed string like `bg-${x}-500` produces no CSS.
 */
const GROUP_COLORS: Record<TeamColorGroup, TeamColors> = {
  jade: JADE,
  stone: STONE,
  navy: NAVY,
  gold: GOLD,
};

/**
 * Resolves the classes a team's column renders with.
 * @param team - Team number as shown in the header
 * @returns The team's header, border, background and accent classes, or the default when it has none
 */
export function getTeamColors(team: number): TeamColors {
  const group = teamColorGroup(team);

  return group ? GROUP_COLORS[group] : DEFAULT_TEAM_COLORS;
}
