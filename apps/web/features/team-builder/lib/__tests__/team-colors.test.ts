import { describe, expect, it } from "vitest";

import { getTeamColors } from "../team-colors";

describe("getTeamColors", () => {
  it("mỗi nhóm màu có chấm đánh dấu riêng", () => {
    const markers = [1, 6, 8, 9].map((team) => getTeamColors(team).marker);

    expect(new Set(markers).size).toBe(4);
  });

  it("các đội cùng nhóm dùng chung màu", () => {
    expect(getTeamColors(1)).toBe(getTeamColors(5));
  });

  it("đội ngoài mọi nhóm vẫn có chấm đánh dấu mặc định", () => {
    expect(getTeamColors(99).marker).toBeTruthy();
  });
});
