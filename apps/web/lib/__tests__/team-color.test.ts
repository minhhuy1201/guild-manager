import { TeamColor } from "@guild/shared/enums";
import { describe, expect, it } from "vitest";

import { resolveTeamColor, TEAM_COLOR_STYLES } from "../team-color";

describe("resolveTeamColor", () => {
  it.each([
    [1, TeamColor.JADE],
    [5, TeamColor.JADE],
    [6, TeamColor.STONE],
    [7, TeamColor.STONE],
    [8, TeamColor.NAVY],
    [9, TeamColor.GOLD],
    [10, TeamColor.GOLD],
  ])("gives team %i its default group colour when none is chosen", (team, color) => {
    expect(resolveTeamColor(team, {})).toBe(color);
  });

  it("returns the chosen colour over the default group", () => {
    expect(resolveTeamColor(3, { "3": TeamColor.RED })).toBe(TeamColor.RED);
  });

  it("ignores a choice made for another team", () => {
    expect(resolveTeamColor(3, { "4": TeamColor.RED })).toBe(TeamColor.JADE);
  });

  it("throws for a team with no default group", () => {
    expect(() => resolveTeamColor(99, {})).toThrow(/team 99/i);
  });
});

describe("TEAM_COLOR_STYLES", () => {
  it("gives every colour its own marker class and canvas hex", () => {
    const styles = Object.values(TEAM_COLOR_STYLES);

    expect(new Set(styles.map((style) => style.marker)).size).toBe(8);
    expect(new Set(styles.map((style) => style.hex)).size).toBe(8);
  });
});
