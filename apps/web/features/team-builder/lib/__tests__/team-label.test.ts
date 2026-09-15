import { describe, expect, it } from "vitest";

import { teamLabel } from "../team-label";

// Tên đội hiện ở hai nơi (đầu cột và chip chọn đội trên điện thoại), nên cả hai đọc cùng một quy tắc.
describe("teamLabel", () => {
  it("đội có tên thì hiện tên", () => {
    expect(teamLabel(3, "TOP")).toBe("TOP");
  });

  it("đội chưa đặt tên thì hiện số đội", () => {
    expect(teamLabel(3, "")).toBe("3");
  });
});
