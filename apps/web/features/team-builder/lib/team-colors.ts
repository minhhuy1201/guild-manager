import { teamColorGroup, type TeamColorGroup } from "@/lib/team-color-group";

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
 * Fallback used by any team no colour group covers - the original look: a
 * primary header on the plain card. Edit here to change every unstyled team at once.
 */
const DEFAULT_TEAM_COLORS: TeamColors = {
  header: "bg-primary text-primary-foreground",
  border: "border-border",
  background: "bg-card",
};

/*
 * Each colour group as a quiet tint of its colour. Text stays `foreground` on every header: the tints
 * are too light to need inverting.
 */
const JADE: TeamColors = {
  header: "bg-jade/30 text-foreground",
  border: "border-jade/60",
  background: "bg-jade/10",
};

const STONE: TeamColors = {
  header: "bg-foreground/15 text-foreground",
  border: "border-foreground/30",
  background: "bg-foreground/[0.06]",
};

const NAVY: TeamColors = {
  header: "bg-primary/25 text-foreground",
  border: "border-primary/50",
  background: "bg-primary/10",
};

const GOLD: TeamColors = {
  header: "bg-gold/45 text-foreground",
  border: "border-gold/80",
  background: "bg-gold/20",
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
 * @returns The team's header, border and background classes, or the default when it has none
 */
export function getTeamColors(team: number): TeamColors {
  const group = teamColorGroup(team);

  return group ? GROUP_COLORS[group] : DEFAULT_TEAM_COLORS;
}
