import { teamColorGroup, type TeamColorGroup } from "@/lib/team-color-group";

/** Classes one team renders with, each written out as a complete Tailwind literal. */
interface TeamColors {
  /** Header surface and its text */
  header: string;
  /** Column surface */
  background: string;
  /** The dot beside the team name, the team colour at full strength */
  marker: string;
}

/**
 * Fallback used by any team no colour group covers: a primary wash header and a primary
 * marker dot on the plain card. Edit here to change every unstyled team at once.
 */
const DEFAULT_TEAM_COLORS: TeamColors = {
  header: "bg-primary/15 text-foreground",
  background: "bg-card",
  marker: "bg-primary",
};

/*
 * Each colour group is a faint wash in the header plus a full-strength dot beside the name, over the
 * plain card. No bar along the top edge: the card's rounded corner clipped it into an asymmetric
 * curve. The card border is neutral for every team. The body stays neutral so ten tinted columns do
 * not compete with the member cards, which carry their own class colour. Text stays `foreground`
 * on every header.
 */
const JADE: TeamColors = {
  header: "bg-jade/15 text-foreground",
  background: "bg-card",
  marker: "bg-jade",
};

const STONE: TeamColors = {
  header: "bg-foreground/[0.08] text-foreground",
  background: "bg-card",
  marker: "bg-foreground/45",
};

const NAVY: TeamColors = {
  header: "bg-primary/15 text-foreground",
  background: "bg-card",
  marker: "bg-primary",
};

const GOLD: TeamColors = {
  header: "bg-gold/20 text-foreground",
  background: "bg-card",
  marker: "bg-gold",
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
 * @returns The team's header, background and marker classes, or the default when it has none
 */
export function getTeamColors(team: number): TeamColors {
  const group = teamColorGroup(team);

  return group ? GROUP_COLORS[group] : DEFAULT_TEAM_COLORS;
}
