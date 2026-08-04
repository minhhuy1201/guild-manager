import { describe, expect, it } from "vitest";

import type { Slot } from "../../types/formation";
import type { SessionFormation } from "../../types/session-formation";
import { buildPrefill } from "../prefill";

const SLOTS: Slot[] = [
  { id: "team-1-pos-1", team: 1, position: 1 },
  { id: "team-1-pos-2", team: 1, position: 2 },
  { id: "team-1-pos-3", team: 1, position: 3 },
];

/**
 * Dựng một trận cho test.
 * @param overrides - Các field cần đổi so với mặc định
 * @returns Trận đầy đủ field
 */
function session(overrides: Partial<SessionFormation>): SessionFormation {
  return {
    sessionId: "s",
    label: "Thứ 3 · 20:30",
    dateTime: "2026-07-21T13:30:00.000Z",
    isGuildWar: false,
    opponent: null,
    locked: false,
    assignment: {},
    ...overrides,
  };
}

const TUESDAY = session({
  sessionId: "tue",
  label: "Thứ 3 · 20:30",
  dateTime: "2026-07-21T13:30:00.000Z",
  locked: true,
  assignment: {
    "team-1-pos-1": "char-1",
    "team-1-pos-2": "char-2",
    "team-1-pos-3": "char-3",
  },
});

const THURSDAY = session({
  sessionId: "thu",
  label: "Thứ 5 · 20:30",
  dateTime: "2026-07-23T13:30:00.000Z",
});

const SATURDAY = session({
  sessionId: "sat",
  label: "Thứ 7 · Guild War",
  dateTime: "2026-07-25T13:00:00.000Z",
});

describe("buildPrefill", () => {
  it("giữ đúng vị trí của người vẫn đánh trận này", () => {
    const result = buildPrefill(
      [TUESDAY, THURSDAY, SATURDAY],
      "thu",
      new Set(["char-1", "char-3"]),
      SLOTS
    );

    expect(result?.assignment).toEqual({
      "team-1-pos-1": "char-1",
      "team-1-pos-2": null,
      "team-1-pos-3": "char-3",
    });
  });

  it("đếm đúng số người bị bỏ vì không đánh trận này", () => {
    const result = buildPrefill(
      [TUESDAY, THURSDAY, SATURDAY],
      "thu",
      new Set(["char-1"]),
      SLOTS
    );

    expect(result?.droppedCount).toBe(2);
  });

  it("nêu tên trận được lấy làm nguồn", () => {
    const result = buildPrefill(
      [TUESDAY, THURSDAY, SATURDAY],
      "thu",
      new Set(["char-1"]),
      SLOTS
    );

    expect(result?.sourceLabel).toBe("Thứ 3 · 20:30");
  });

  it("lấy trận GẦN NHẤT trước đó, không phải trận đầu tuần", () => {
    const thursdayWithFormation = session({
      ...THURSDAY,
      assignment: { "team-1-pos-1": "char-9" },
    });

    const result = buildPrefill(
      [TUESDAY, thursdayWithFormation, SATURDAY],
      "sat",
      new Set(["char-9"]),
      SLOTS
    );

    expect(result?.sourceLabel).toBe("Thứ 5 · 20:30");
    expect(result?.assignment["team-1-pos-1"]).toBe("char-9");
  });

  it("trả null khi không có trận nào trước đó", () => {
    expect(
      buildPrefill([TUESDAY, THURSDAY, SATURDAY], "tue", new Set(), SLOTS)
    ).toBeNull();
  });

  it("trả null khi các trận trước đó đều chưa xếp đội hình", () => {
    const emptyTuesday = session({ ...TUESDAY, assignment: {} });

    expect(
      buildPrefill([emptyTuesday, THURSDAY, SATURDAY], "thu", new Set(), SLOTS)
    ).toBeNull();
  });
});
