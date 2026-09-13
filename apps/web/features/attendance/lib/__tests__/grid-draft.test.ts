import { describe, expect, it } from "vitest";

import { clickCell, type GridDraft } from "../grid-draft";
import { recordKey } from "../record-key";

const CELL = { characterId: "char-1", sessionId: "sess-1" };
const KEY = recordKey(CELL.characterId, CELL.sessionId);

/**
 * Click the cell under test a number of times, starting from an empty draft.
 * @param saved - What the server holds for the cell
 * @param times - How many clicks
 * @returns The draft after the clicks
 */
function clickTimes(saved: boolean | undefined, times: number): GridDraft {
  let draft: GridDraft = {};
  for (let click = 0; click < times; click += 1) {
    draft = clickCell(draft, CELL, saved);
  }
  return draft;
}

describe("clickCell", () => {
  it("ô chưa điểm danh bấm lần đầu thành Có", () => {
    expect(clickTimes(undefined, 1)[KEY]).toEqual({ ...CELL, isPresent: true });
  });

  it("bấm lần hai thành Không", () => {
    expect(clickTimes(undefined, 2)[KEY]?.isPresent).toBe(false);
  });

  // Chủ bang đã chốt: API không có endpoint xoá, nên vòng xoay không quay về "chưa điểm danh".
  it("bấm lần ba quay lại Có, không về chưa điểm danh", () => {
    expect(clickTimes(undefined, 3)[KEY]?.isPresent).toBe(true);
  });

  it("server đang là Có thì bấm thành Không", () => {
    expect(clickTimes(true, 1)[KEY]?.isPresent).toBe(false);
  });

  it("bấm về đúng giá trị server thì ô rời khỏi nháp", () => {
    expect(clickTimes(true, 2)).toEqual({});
  });

  it("không sửa nháp gốc", () => {
    const draft: GridDraft = {};

    clickCell(draft, CELL, undefined);

    expect(draft).toEqual({});
  });

  it("giữ nguyên các ô khác trong nháp", () => {
    const other = { characterId: "char-2", sessionId: "sess-1", isPresent: false };
    const draft: GridDraft = { [recordKey("char-2", "sess-1")]: other };

    const next = clickCell(draft, CELL, undefined);

    expect(next[recordKey("char-2", "sess-1")]).toEqual(other);
    expect(Object.keys(next)).toHaveLength(2);
  });
});
