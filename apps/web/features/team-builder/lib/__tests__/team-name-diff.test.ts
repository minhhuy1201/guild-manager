import { describe, expect, it } from "vitest";

import { countNameChanges } from "../team-name-diff";

const SAVED = { "1": "Xung kích", "2": "Thủ nhà" };

describe("countNameChanges", () => {
  it("tên giống bản lưu thì là 0", () => {
    expect(countNameChanges({ ...SAVED }, SAVED)).toBe(0);
  });

  it("đổi tên một đội là 1", () => {
    expect(countNameChanges({ ...SAVED, "2": "Hậu cần" }, SAVED)).toBe(1);
  });

  it("xoá tên một đội (về lại số đội) là 1", () => {
    expect(countNameChanges({ "1": "Xung kích" }, SAVED)).toBe(1);
  });

  it("đặt tên cho đội chưa có tên là 1", () => {
    expect(countNameChanges({ ...SAVED, "5": "Du kích" }, SAVED)).toBe(1);
  });
});
