import { describe, expect, it } from "vitest";

import type { Assignment, MatchDraft } from "../../types/formation";
import { countDayChanges, isDayDirty, isSameDay } from "../formation-diff";

const SAVED: Assignment = {
  "team-1-pos-1": "char-1",
  "team-1-pos-2": null,
};

/**
 * Wrap a formation into a single-match, note-less day — the shape `isDayDirty` takes.
 * @param assignment - Formation of the only match
 * @returns The single-match day
 */
function day(assignment: Assignment): MatchDraft[] {
  return [{ assignment, notes: {} }];
}

describe("isDayDirty — phần đội hình", () => {
  const savedDay = day(SAVED);

  it("chưa có nháp thì không coi là chưa lưu", () => {
    expect(isDayDirty(undefined, savedDay)).toBe(false);
  });

  it("nháp trùng bản đã lưu thì không coi là chưa lưu", () => {
    expect(isDayDirty(day({ ...SAVED }), savedDay)).toBe(false);
  });

  it("đổi người ở một ô thì báo chưa lưu", () => {
    expect(
      isDayDirty(day({ ...SAVED, "team-1-pos-1": "char-2" }), savedDay)
    ).toBe(true);
  });

  it("xếp thêm người vào ô trống thì báo chưa lưu", () => {
    expect(
      isDayDirty(day({ ...SAVED, "team-1-pos-2": "char-9" }), savedDay)
    ).toBe(true);
  });

  it("gỡ người khỏi ô thì báo chưa lưu", () => {
    expect(isDayDirty(day({ ...SAVED, "team-1-pos-1": null }), savedDay)).toBe(
      true
    );
  });

  it("nháp thiếu một ô ĐANG CÓ NGƯỜI thì báo chưa lưu", () => {
    expect(isDayDirty(day({ "team-1-pos-2": null }), savedDay)).toBe(true);
  });

  it("nháp thiếu một ô vốn đang trống thì vẫn coi là chưa đổi gì", () => {
    // A missing key and a null value mean the same thing: nobody is in that slot.
    expect(isDayDirty(day({ "team-1-pos-1": "char-1" }), savedDay)).toBe(false);
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
   * Deep-copy a saved day so a test can mutate freely without touching the original.
   * @param matches - Day to copy
   * @returns An independent copy
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

describe("countDayChanges", () => {
  const saved: MatchDraft[] = [
    {
      assignment: { "team-1-pos-1": "char-1", "team-1-pos-2": null },
      notes: { "team-1-pos-1": "giữ buồng" },
    },
  ];

  /**
   * Deep-copy a saved day so a test can edit it without touching the original.
   * @param matches - Day to copy
   * @returns An independent copy
   */
  function copy(matches: MatchDraft[]): MatchDraft[] {
    return matches.map((match) => ({
      assignment: { ...match.assignment },
      notes: { ...match.notes },
    }));
  }

  it("chưa có nháp thì là 0", () => {
    expect(countDayChanges(undefined, saved)).toBe(0);
  });

  it("nháp giống bản lưu thì là 0", () => {
    expect(countDayChanges(copy(saved), saved)).toBe(0);
  });

  it("đổi người ở một ô là 1", () => {
    const draft = copy(saved);
    draft[0].assignment["team-1-pos-2"] = "char-9";

    expect(countDayChanges(draft, saved)).toBe(1);
  });

  it("đổi người và sửa ghi chú là 2", () => {
    const draft = copy(saved);
    draft[0].assignment["team-1-pos-1"] = null;
    draft[0].notes["team-1-pos-1"] = "vào sau";

    expect(countDayChanges(draft, saved)).toBe(2);
  });

  it("ghi chú xoá trắng coi như không có ghi chú", () => {
    const draft = copy(saved);
    draft[0].notes["team-1-pos-2"] = "  ";

    expect(countDayChanges(draft, saved)).toBe(0);
  });

  // Trận 2 chép nguyên trận 1, nên đếm từng ô của nó sẽ ra một con số không ai hiểu.
  it("thêm trận 2 tính là một thay đổi", () => {
    expect(countDayChanges([...copy(saved), ...copy(saved)], saved)).toBe(1);
  });

  it("bỏ trận 2 tính là một thay đổi", () => {
    expect(countDayChanges(copy(saved), [...saved, ...saved])).toBe(1);
  });
});

describe("isSameDay", () => {
  const saved: MatchDraft[] = [
    {
      assignment: { "team-1-pos-1": "char-1", "team-1-pos-2": null },
      notes: { "team-1-pos-1": "giữ buồng" },
    },
  ];

  /**
   * Deep-copy a day so a test can edit it without touching the original.
   * @param matches - Day to copy
   * @returns An independent copy
   */
  function copy(matches: MatchDraft[]): MatchDraft[] {
    return matches.map((match) => ({
      assignment: { ...match.assignment },
      notes: { ...match.notes },
    }));
  }

  it("bản chép y hệt thì giống", () => {
    expect(isSameDay(copy(saved), saved)).toBe(true);
  });

  it("ô thiếu khoá và ô null đều là ô trống, nên vẫn giống", () => {
    const draft = copy(saved);
    delete draft[0].assignment["team-1-pos-2"];

    expect(isSameDay(draft, saved)).toBe(true);
  });

  // Khác isDayDirty: dấu cách người dùng vừa gõ là một thao tác thật, dù chưa làm ngày thành "chưa lưu".
  it("thêm dấu cách cuối ghi chú là khác", () => {
    const draft = copy(saved);
    draft[0].notes["team-1-pos-1"] = "giữ buồng ";

    expect(isSameDay(draft, saved)).toBe(false);
  });

  it("đổi người là khác", () => {
    const draft = copy(saved);
    draft[0].assignment["team-1-pos-2"] = "char-9";

    expect(isSameDay(draft, saved)).toBe(false);
  });

  it("khác số trận là khác", () => {
    expect(isSameDay([...copy(saved), ...copy(saved)], saved)).toBe(false);
  });
});
