import { describe, expect, it } from "vitest";

import { formatLeaveRange } from "../leave-label";

describe("formatLeaveRange", () => {
  it("đổi hai ngày YYYY-MM-DD thành dd/mm - dd/mm", () => {
    expect(formatLeaveRange("2026-10-05", "2026-10-12")).toBe("05/10 - 12/10");
  });
});
