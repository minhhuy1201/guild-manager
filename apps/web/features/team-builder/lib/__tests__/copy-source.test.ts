import { describe, expect, it } from "vitest";

import type { MatchDraft } from "../../types/formation";
import { findCopySource, type CopyCandidate } from "../copy-source";

/**
 * Build a match holding one person.
 * @param characterId - Who stands in the first slot
 * @returns A match draft
 */
function filled(characterId: string): MatchDraft {
  return { assignment: { "team-1-pos-1": characterId }, notes: {} };
}

const EMPTY: MatchDraft = { assignment: { "team-1-pos-1": null }, notes: {} };

/**
 * Build one candidate day.
 * @param sessionId - Id of the battle
 * @param label - Display label
 * @param matches - Matches of the day
 * @returns A copy candidate
 */
function day(
  sessionId: string,
  label: string,
  matches: MatchDraft[]
): CopyCandidate {
  return { sessionId, label, matches };
}

const TUESDAY = day("tue", "Thứ 3 · 20:30", [filled("char-1")]);
const THURSDAY = day("thu", "Thứ 5 · 20:30", [EMPTY]);
const SATURDAY = day("sat", "Thứ 7 · Bang Chiến", [EMPTY]);

describe("findCopySource", () => {
  it("lấy ngày gần nhất trước đó có đội hình trong cùng tuần", () => {
    const source = findCopySource([TUESDAY, THURSDAY, SATURDAY], "sat", []);

    expect(source?.sessionId).toBe("tue");
    expect(source?.match).toEqual(filled("char-1"));
  });

  it("bỏ qua ngày chỉ có ghi chú, không có người", () => {
    const noteOnly = day("wed", "Thứ 4 · 20:30", [
      { assignment: { "team-1-pos-1": null }, notes: { "team-1-pos-1": "x" } },
    ]);
    const source = findCopySource([TUESDAY, noteOnly, SATURDAY], "sat", []);

    expect(source?.sessionId).toBe("tue");
  });

  it("lấy trận cuối của ngày nguồn và ghi rõ số trận trong nhãn", () => {
    const twoMatches = day("tue", "Thứ 3 · 20:30", [
      filled("char-1"),
      filled("char-9"),
    ]);
    const source = findCopySource([twoMatches, SATURDAY], "sat", []);

    expect(source?.match).toEqual(filled("char-9"));
    expect(source?.label).toBe("Thứ 3 · 20:30 · trận 2");
  });

  it("ngày một trận thì nhãn chỉ là tên ngày", () => {
    const source = findCopySource([TUESDAY, SATURDAY], "sat", []);

    expect(source?.label).toBe("Thứ 3 · 20:30");
  });

  it("không có ngày nào trước đó thì lùi sang tuần trước, lấy ngày cuối cùng có đội hình", () => {
    const lastWeek = [
      day("prev-tue", "Thứ 3 · 20:30", [filled("char-7")]),
      day("prev-sat", "Thứ 7 · Bang Chiến", [filled("char-8")]),
    ];
    const source = findCopySource([THURSDAY, SATURDAY], "thu", lastWeek);

    expect(source?.sessionId).toBe("prev-sat");
    expect(source?.match).toEqual(filled("char-8"));
  });

  it("tuần trước mà ngày cuối chưa xếp thì lùi tiếp lên ngày trước nữa", () => {
    const lastWeek = [
      day("prev-tue", "Thứ 3 · 20:30", [filled("char-7")]),
      day("prev-sat", "Thứ 7 · Bang Chiến", [EMPTY]),
    ];
    const source = findCopySource([THURSDAY], "thu", lastWeek);

    expect(source?.sessionId).toBe("prev-tue");
  });

  it("trong tuần đã có nguồn thì không đụng tới tuần trước", () => {
    const lastWeek = [day("prev-sat", "Thứ 7 · Bang Chiến", [filled("char-8")])];
    const source = findCopySource([TUESDAY, SATURDAY], "sat", lastWeek);

    expect(source?.sessionId).toBe("tue");
  });

  it("không tuần nào có đội hình thì trả null", () => {
    expect(findCopySource([THURSDAY, SATURDAY], "sat", [])).toBeNull();
  });

  it("ngày đích không nằm trong tuần thì trả null", () => {
    expect(findCopySource([TUESDAY, SATURDAY], "khong-co", [])).toBeNull();
  });
});
