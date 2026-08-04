import { describe, expect, it } from "vitest";

import { fromInputValue, toInputValue } from "../datetime-input";

describe("datetime-input", () => {
  it("đổi ISO sang chuỗi datetime-local theo giờ máy", () => {
    expect(toInputValue("2026-07-21T13:30:00.000Z")).toBe("2026-07-21T20:30");
  });

  it("đổi chuỗi datetime-local ngược lại thành ISO", () => {
    expect(fromInputValue("2026-07-21T20:30")).toBe("2026-07-21T13:30:00.000Z");
  });

  it("đi vòng tròn không đổi giá trị", () => {
    const iso = "2026-07-25T13:00:00.000Z";

    expect(fromInputValue(toInputValue(iso))).toBe(iso);
  });
});
