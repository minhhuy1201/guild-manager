/**
 * The colour groups the guild splits its ten teams into. Each group is one colour the palette
 * already owns - jade, the warm neutral, navy, gold - so the team builder's grid and the tactics
 * map read as grouped the same way without adding a hue of their own.
 */
export type TeamColorGroup = "jade" | "stone" | "navy" | "gold";

/**
 * Group of each team, keyed by team number. Edit here to move a team into another group: the team
 * builder's columns and the team tokens on the tactics map both follow.
 */
const TEAM_COLOR_GROUPS: Record<number, TeamColorGroup> = {
  1: "jade",
  2: "jade",
  3: "jade",
  4: "jade",
  5: "jade",
  6: "stone",
  7: "stone",
  8: "navy",
  9: "gold",
  10: "gold",
};

/**
 * Resolves the colour group a team belongs to.
 * @param team - Team number as shown in the team builder's header
 * @returns The team's group, or null for a team no group covers
 */
export function teamColorGroup(team: number): TeamColorGroup | null {
  return TEAM_COLOR_GROUPS[team] ?? null;
}
