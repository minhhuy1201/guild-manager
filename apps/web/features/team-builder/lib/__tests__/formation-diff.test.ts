import { describe, expect, it } from "vitest";

import type { Assignment } from "../../types/formation";
import { isDirty } from "../formation-diff";

const SAVED: Assignment = {
  "team-1-pos-1": "char-1",
  "team-1-pos-2": null,
};

describe("isDirty", () => {
  it("chưa có nháp thì không coi là chưa lưu", () => {
    expect(isDirty(undefined, SAVED)).toBe(false);
  });

  it("nháp trùng bản đã lưu thì không coi là chưa lưu", () => {
    expect(isDirty({ ...SAVED }, SAVED)).toBe(false);
  });

  it("đổi người ở một ô thì báo chưa lưu", () => {
    expect(isDirty({ ...SAVED, "team-1-pos-1": "char-2" }, SAVED)).toBe(true);
  });

  it("xếp thêm người vào ô trống thì báo chưa lưu", () => {
    expect(isDirty({ ...SAVED, "team-1-pos-2": "char-9" }, SAVED)).toBe(true);
  });

  it("gỡ người khỏi ô thì báo chưa lưu", () => {
    expect(isDirty({ ...SAVED, "team-1-pos-1": null }, SAVED)).toBe(true);
  });

  it("nháp thiếu một ô ĐANG CÓ NGƯỜI thì báo chưa lưu", () => {
    expect(isDirty({ "team-1-pos-2": null }, SAVED)).toBe(true);
  });

  it("nháp thiếu một ô vốn đang trống thì vẫn coi là chưa đổi gì", () => {
    // Thiếu khoá và mang null là cùng một nghĩa: ô đó không có ai.
    expect(isDirty({ "team-1-pos-1": "char-1" }, SAVED)).toBe(false);
  });
});
