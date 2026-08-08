import { describe, expect, it } from "vitest";

import type { Assignment, MatchDraft } from "../../types/formation";
import { isDayDirty, isDirty } from "../formation-diff";

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

describe("isDayDirty", () => {
  const saved: MatchDraft[] = [
    {
      assignment: { "team-1-pos-1": "char-1" },
      notes: { "team-1-pos-1": "giữ buồng" },
    },
  ];

  /**
   * Chép sâu một ngày đã lưu để test sửa thoải mái mà không đụng bản gốc.
   * @param matches - Ngày cần chép
   * @returns Bản sao độc lập
   */
  function copy(matches: MatchDraft[]): MatchDraft[] {
    return matches.map((match) => ({
      assignment: { ...match.assignment },
      notes: { ...match.notes },
    }));
  }

  it("chưa động vào thì không dirty", () => {
    expect(isDayDirty(undefined, saved)).toBe(false);
  });

  it("nháp giống hệt bản lưu thì không dirty", () => {
    expect(isDayDirty(copy(saved), saved)).toBe(false);
  });

  it("vừa thêm trận 2 là dirty", () => {
    expect(
      isDayDirty([...copy(saved), { assignment: {}, notes: {} }], saved)
    ).toBe(true);
  });

  it("vừa bỏ trận 2 là dirty", () => {
    expect(
      isDayDirty(copy(saved), [...saved, { assignment: {}, notes: {} }])
    ).toBe(true);
  });

  it("đổi người là dirty", () => {
    const draft = copy(saved);
    draft[0].assignment["team-1-pos-1"] = "char-9";

    expect(isDayDirty(draft, saved)).toBe(true);
  });

  it("đổi người trong trận 2 là dirty", () => {
    const twoMatches = [...saved, { assignment: {}, notes: {} }];
    const draft = copy(twoMatches);
    draft[1].assignment["team-1-pos-1"] = "char-9";

    expect(isDayDirty(draft, twoMatches)).toBe(true);
  });

  it("sửa ghi chú là dirty", () => {
    const draft = copy(saved);
    draft[0].notes["team-1-pos-1"] = "vào sau";

    expect(isDayDirty(draft, saved)).toBe(true);
  });

  it("thêm ghi chú vào ô trống là dirty", () => {
    const draft = copy(saved);
    draft[0].notes["team-1-pos-2"] = "chừa cho X";

    expect(isDayDirty(draft, saved)).toBe(true);
  });

  it("sửa ghi chú rồi sửa về như cũ thì hết dirty", () => {
    const draft = copy(saved);
    draft[0].notes["team-1-pos-1"] = "vào sau";
    draft[0].notes["team-1-pos-1"] = "giữ buồng";

    expect(isDayDirty(draft, saved)).toBe(false);
  });

  it("gõ ghi chú rồi xoá trắng thì không tính là dirty", () => {
    const draft = copy(saved);
    draft[0].notes["team-1-pos-2"] = "";

    expect(isDayDirty(draft, saved)).toBe(false);
  });
});
