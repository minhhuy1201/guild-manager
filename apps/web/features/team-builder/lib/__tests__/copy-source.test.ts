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
  it("lấy đúng ngày liền trước trong cùng tuần", () => {
    const source = findCopySource([TUESDAY, THURSDAY, SATURDAY], "thu", []);

    expect(source?.sessionId).toBe("tue");
    expect(source?.match).toEqual(filled("char-1"));
  });

  it("ngày liền trước chưa xếp gì thì không có nguồn, không lùi tiếp", () => {
    expect(findCopySource([TUESDAY, THURSDAY, SATURDAY], "sat", [])).toBeNull();
  });

  it("ngày liền trước chỉ có ghi chú cũng coi như chưa xếp", () => {
    const noteOnly = day("wed", "Thứ 4 · 20:30", [
      { assignment: { "team-1-pos-1": null }, notes: { "team-1-pos-1": "x" } },
    ]);

    expect(findCopySource([TUESDAY, noteOnly, SATURDAY], "sat", [])).toBeNull();
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

  it("ngày liền trước có người ở trận 1 nhưng trận 2 rỗng thì không có nguồn", () => {
    const emptiedSecond = day("tue", "Thứ 3 · 20:30", [filled("char-1"), EMPTY]);

    expect(findCopySource([emptiedSecond, SATURDAY], "sat", [])).toBeNull();
  });

  it("ngày một trận thì nhãn chỉ là tên ngày", () => {
    const source = findCopySource([TUESDAY, SATURDAY], "sat", []);

    expect(source?.label).toBe("Thứ 3 · 20:30");
  });

  it("ngày đầu tuần lấy ngày cuối cùng của tuần trước", () => {
    const lastWeek = [
      day("prev-tue", "Thứ 3 · 20:30", [filled("char-7")]),
      day("prev-sat", "Thứ 7 · Bang Chiến", [filled("char-8")]),
    ];
    const source = findCopySource([TUESDAY, SATURDAY], "tue", lastWeek);

    expect(source?.sessionId).toBe("prev-sat");
    expect(source?.match).toEqual(filled("char-8"));
  });

  it("ngày cuối tuần trước chưa xếp thì cũng không có nguồn", () => {
    const lastWeek = [
      day("prev-tue", "Thứ 3 · 20:30", [filled("char-7")]),
      day("prev-sat", "Thứ 7 · Bang Chiến", [EMPTY]),
    ];

    expect(findCopySource([TUESDAY, SATURDAY], "tue", lastWeek)).toBeNull();
  });

  it("ngày giữa tuần không đụng tới tuần trước", () => {
    const lastWeek = [day("prev-sat", "Thứ 7 · Bang Chiến", [filled("char-8")])];
    const source = findCopySource([TUESDAY, THURSDAY], "thu", lastWeek);

    expect(source?.sessionId).toBe("tue");
  });

  it("ngày đầu tuần mà tuần trước không có gì thì trả null", () => {
    expect(findCopySource([TUESDAY, SATURDAY], "tue", [])).toBeNull();
  });

  it("ngày đích không nằm trong tuần thì trả null", () => {
    expect(findCopySource([TUESDAY, SATURDAY], "khong-co", [])).toBeNull();
  });
});
