import { describe, expect, it } from "vitest";

import { willDropFormation } from "../match-count";

describe("willDropFormation", () => {
  it("tạo mới thì không có gì để mất", () => {
    expect(willDropFormation(null, 1)).toBe(false);
  });

  it("hạ xuống dưới số đội hình đã xếp là mất dữ liệu", () => {
    expect(willDropFormation({ formationMatchCount: 2 }, 1)).toBe(true);
  });

  it("ngày 2 trận mới xếp 1 đội hình thì hạ xuống 1 không mất gì", () => {
    expect(willDropFormation({ formationMatchCount: 1 }, 1)).toBe(false);
  });

  it("giữ nguyên hoặc tăng thì không bao giờ mất", () => {
    expect(willDropFormation({ formationMatchCount: 2 }, 2)).toBe(false);
  });
});
