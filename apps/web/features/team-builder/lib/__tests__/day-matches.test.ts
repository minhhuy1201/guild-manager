import { describe, expect, it } from "vitest";

import type { MatchDraft } from "../../types/formation";
import { lastLineUp, withoutEmptySecondMatch } from "../day-matches";

const SLOT = "team-1-pos-1";

/**
 * Build a match holding one person.
 * @param characterId - Who stands in the first slot
 * @returns A match draft
 */
function filled(characterId: string): MatchDraft {
  return { assignment: { [SLOT]: characterId }, notes: {} };
}

const EMPTY: MatchDraft = { assignment: { [SLOT]: null }, notes: {} };

describe("lastLineUp", () => {
  it("ngày một trận có người thì trả về chính trận đó", () => {
    expect(lastLineUp([filled("char-1")])).toEqual(filled("char-1"));
  });

  it("ngày hai trận thì trả về trận cuối", () => {
    expect(lastLineUp([filled("char-1"), filled("char-9")])).toEqual(
      filled("char-9")
    );
  });

  it("trận cuối rỗng thì trả null, dù trận 1 có người", () => {
    expect(lastLineUp([filled("char-1"), EMPTY])).toBeNull();
  });

  it("trận cuối chỉ có ghi chú cũng coi như rỗng", () => {
    const noteOnly: MatchDraft = {
      assignment: { [SLOT]: null },
      notes: { [SLOT]: "chừa cho X" },
    };

    expect(lastLineUp([noteOnly])).toBeNull();
  });

  it("không có trận nào thì trả null", () => {
    expect(lastLineUp([])).toBeNull();
  });
});

describe("withoutEmptySecondMatch", () => {
  it("bỏ trận 2 khi không còn ai đứng trong đó", () => {
    expect(withoutEmptySecondMatch([filled("char-1"), EMPTY])).toEqual([
      filled("char-1"),
    ]);
  });

  it("trận 2 có ghi chú nhưng không có ai thì vẫn bỏ", () => {
    const noteOnly: MatchDraft = {
      assignment: { [SLOT]: null },
      notes: { [SLOT]: "chừa cho X" },
    };

    expect(withoutEmptySecondMatch([filled("char-1"), noteOnly])).toEqual([
      filled("char-1"),
    ]);
  });

  it("trận 2 còn người thì giữ nguyên cả hai", () => {
    const matches = [filled("char-1"), filled("char-9")];

    expect(withoutEmptySecondMatch(matches)).toEqual(matches);
  });

  it("ngày một trận thì không đụng tới, kể cả khi trận đó rỗng", () => {
    expect(withoutEmptySecondMatch([EMPTY])).toEqual([EMPTY]);
  });

  it("cả hai trận đều rỗng thì còn lại đúng một trận rỗng", () => {
    expect(withoutEmptySecondMatch([EMPTY, EMPTY])).toEqual([EMPTY]);
  });

  it("không sửa mảng gốc", () => {
    const matches = [filled("char-1"), EMPTY];
    withoutEmptySecondMatch(matches);

    expect(matches).toHaveLength(2);
  });
});
