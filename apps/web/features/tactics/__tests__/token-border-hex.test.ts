import { describe, expect, it } from "vitest";
import { TeamColor } from "@guild/shared/enums";

import { NO_CHOSEN_COLORS, TEAM_COLOR_STYLES } from "@/lib/team-color";
import { COLOR_HEX, tokenBorderHex } from "../lib/token-icon";

describe("tokenBorderHex", () => {
  it("rings a numbered team in the colour a manager chose for it", () => {
    const hex = tokenBorderHex(
      { icon: "number-3", color: "blue" },
      { "3": TeamColor.RED }
    );

    expect(hex).toBe(TEAM_COLOR_STYLES[TeamColor.RED].hex);
  });

  it("falls back to the team's default group colour when none was chosen", () => {
    // Team 3 sits in the JADE group by default.
    expect(tokenBorderHex({ icon: "number-3", color: "blue" }, NO_CHOSEN_COLORS)).toBe(
      TEAM_COLOR_STYLES[TeamColor.JADE].hex
    );
  });

  it("ignores a colour chosen for another team", () => {
    expect(
      tokenBorderHex({ icon: "number-3", color: "blue" }, { "4": TeamColor.RED })
    ).toBe(TEAM_COLOR_STYLES[TeamColor.JADE].hex);
  });

  it("keeps the drawn colour of a token that is not a team", () => {
    expect(
      tokenBorderHex({ icon: "eye", color: "yellow" }, { "3": TeamColor.RED })
    ).toBe(COLOR_HEX.yellow);
  });
});
