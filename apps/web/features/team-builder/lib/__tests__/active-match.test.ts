import { describe, expect, it } from "vitest";

import { resolveActiveMatchIndex } from "../active-match";

describe("resolveActiveMatchIndex", () => {
  it("giữ nguyên khi chỉ số còn hợp lệ", () => {
    expect(resolveActiveMatchIndex(2, 1)).toBe(1);
  });

  it("kẹp về trận 1 khi ngày này chỉ có một trận", () => {
    expect(resolveActiveMatchIndex(1, 1)).toBe(0);
  });

  it("kẹp về trận 1 với chỉ số âm", () => {
    expect(resolveActiveMatchIndex(2, -1)).toBe(0);
  });

  it("ngày chưa có trận nào vẫn trả về 0", () => {
    expect(resolveActiveMatchIndex(0, 1)).toBe(0);
  });
});
