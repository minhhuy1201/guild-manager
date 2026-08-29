/**
 * Fallback used by any team missing from TEAM_HEADER_COLORS — the original look.
 * Edit here to change every unstyled team at once.
 */
const DEFAULT_TEAM_HEADER_COLOR = "bg-primary text-primary-foreground";

/**
 * Header color of each team, keyed by team number. Add or edit an entry to
 * recolor a team; teams left out fall back to DEFAULT_TEAM_HEADER_COLOR.
 *
 * Classes must be written as complete literals — Tailwind scans source text, so
 * a composed string like `bg-${x}-500` produces no CSS.
 */
const TEAM_HEADER_COLORS: Record<number, string> = {
  1: "bg-blue-200 text-black",
  2: "bg-blue-200 text-black",
  3: "bg-blue-200 text-black",
  4: "bg-blue-200 text-black",
  5: "bg-blue-200 text-black",
  6: "bg-lime-400 text-black",
  7: "bg-lime-400 text-black",
  8: "bg-blue-300 text-black",
  9: "bg-yellow-400 text-black",
  10: "bg-yellow-400 text-black",
};

/**
 * Resolves the classes a team's header renders with.
 * @param team - Team number as shown in the header
 * @returns The team's header classes, or the default when it has none
 */
export function getTeamHeaderColor(team: number): string {
  return TEAM_HEADER_COLORS[team] ?? DEFAULT_TEAM_HEADER_COLOR;
}
