import { describe, expect, it } from "vitest";

import { teamLabel } from "../team-label";

// The team name appears in two places (the column head and the team chip on a phone), so both read
// the same rule.
describe("teamLabel", () => {
  it("đội có tên thì hiện tên", () => {
    expect(teamLabel(3, "TOP")).toBe("TOP");
  });

  it("đội chưa đặt tên thì hiện số đội", () => {
    expect(teamLabel(3, "")).toBe("3");
  });
});
