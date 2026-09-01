import type { SessionFormation } from "@guild/shared/schemas";
import { describe, expect, it } from "vitest";

import type { Slot } from "../../types/formation";
import { buildPrefill, isPrefillShowing, type PrefillResult } from "../prefill";

const SLOTS: Slot[] = [
  { id: "team-1-pos-1", team: 1, position: 1 },
  { id: "team-1-pos-2", team: 1, position: 2 },
  { id: "team-1-pos-3", team: 1, position: 3 },
];

/**
 * Build a session for a test.
 * @param overrides - Fields to change from the defaults
 * @returns A fully populated session
 */
function session(overrides: Partial<SessionFormation>): SessionFormation {
  return {
    sessionId: "s",
    label: "Thứ 3 · 20:30",
    dateTime: "2026-07-21T13:30:00.000Z",
    isGuildWar: false,
    matchCount: 2,
    opponent: null,
    locked: false,
    matches: [],
    ...overrides,
  };
}

const TUESDAY = session({
  sessionId: "tue",
  label: "Thứ 3 · 20:30",
  dateTime: "2026-07-21T13:30:00.000Z",
  locked: true,
  matches: [
    {
      slots: {
        "team-1-pos-1": "char-1",
        "team-1-pos-2": "char-2",
        "team-1-pos-3": "char-3",
      },
      notes: {},
    },
  ],
});

const THURSDAY = session({
  sessionId: "thu",
  label: "Thứ 5 · 20:30",
  dateTime: "2026-07-23T13:30:00.000Z",
});

const SATURDAY = session({
  sessionId: "sat",
  label: "Thứ 7 · Bang Chiến",
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
      matches: [{ slots: { "team-1-pos-1": "char-9" }, notes: {} }],
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
    const emptyTuesday = session({ ...TUESDAY, matches: [] });

    expect(
      buildPrefill([emptyTuesday, THURSDAY, SATURDAY], "thu", new Set(), SLOTS)
    ).toBeNull();
  });
  it("lấy đội hình của trận cuối cùng trong ngày trước, không phải trận 1", () => {
    const tuesday = session({
      sessionId: "tue",
      label: "Thứ 3 · 20:30",
      dateTime: "2026-07-21T13:30:00.000Z",
      matches: [
        { slots: { "team-1-pos-1": "char-1" }, notes: {} },
        {
          slots: { "team-1-pos-1": "char-2", "team-1-pos-2": "char-3" },
          notes: {},
        },
      ],
    });

    const result = buildPrefill(
      [tuesday, THURSDAY],
      "thu",
      new Set(["char-2", "char-3"]),
      SLOTS
    );

    expect(result?.assignment["team-1-pos-1"]).toBe("char-2");
    expect(result?.assignment["team-1-pos-2"]).toBe("char-3");
    expect(result?.sourceLabel).toBe("Thứ 3 · 20:30 · trận 2");
  });

  it("ngày trước có trận 2 không còn ai thì chép trận 1, nhãn không nhắc tới trận 2", () => {
    const tuesday = session({
      sessionId: "tue",
      label: "Thứ 3 · 20:30",
      dateTime: "2026-07-21T13:30:00.000Z",
      matches: [
        { slots: { "team-1-pos-1": "char-1" }, notes: {} },
        { slots: {}, notes: { "team-1-pos-1": "vào sau" } },
      ],
    });

    const result = buildPrefill(
      [tuesday, THURSDAY],
      "thu",
      new Set(["char-1"]),
      SLOTS
    );

    expect(result?.assignment["team-1-pos-1"]).toBe("char-1");
    expect(result?.sourceLabel).toBe("Thứ 3 · 20:30");
  });

  it("chép ghi chú sang trận mới, kể cả ghi chú của ô có người bị gỡ vì báo nghỉ", () => {
    const tuesday = session({
      sessionId: "tue",
      label: "Thứ 3 · 20:30",
      dateTime: "2026-07-21T13:30:00.000Z",
      matches: [
        {
          slots: { "team-1-pos-1": "char-1", "team-1-pos-2": "char-2" },
          notes: { "team-1-pos-1": "giữ buồng", "team-1-pos-2": "vào sau" },
        },
      ],
    });
    const thursday = session({
      sessionId: "thu",
      dateTime: "2026-07-23T13:30:00.000Z",
    });

    const result = buildPrefill(
      [tuesday, thursday],
      "thu",
      new Set(["char-1"]),
      SLOTS
    );

    expect(result?.assignment["team-1-pos-2"]).toBeNull();
    expect(result?.droppedCount).toBe(1);
    expect(result?.notes).toEqual({
      "team-1-pos-1": "giữ buồng",
      "team-1-pos-2": "vào sau",
    });
  });

  it("ngày trước chỉ có ghi chú, không có ai, thì không phải nguồn để chép", () => {
    const tuesday = session({
      sessionId: "tue",
      dateTime: "2026-07-21T13:30:00.000Z",
      matches: [{ slots: {}, notes: { "team-1-pos-1": "chừa cho X" } }],
    });
    const thursday = session({
      sessionId: "thu",
      dateTime: "2026-07-23T13:30:00.000Z",
    });

    expect(
      buildPrefill([tuesday, thursday], "thu", new Set(), SLOTS)
    ).toBeNull();
  });

  it("ngày trước chỉ có một trận thì nhãn không kèm số trận", () => {
    const result = buildPrefill(
      [TUESDAY, THURSDAY],
      "thu",
      new Set(["char-1"]),
      SLOTS
    );

    expect(result?.sourceLabel).toBe("Thứ 3 · 20:30");
  });
});

/**
 * Build a fully populated proposal where only the formation matters.
 * @param assignment - The proposed formation
 * @returns A fully populated proposal
 */
function proposal(assignment: PrefillResult["assignment"]): PrefillResult {
  return { assignment, notes: {}, sourceLabel: "Thứ 3 · 20:30", droppedCount: 0 };
}

const PROPOSED = proposal({
  "team-1-pos-1": "char-1",
  "team-1-pos-2": null,
  "team-1-pos-3": null,
});

describe("isPrefillShowing", () => {
  it("nháp đúng bằng đề xuất thì còn hiện", () => {
    const draft = [{ assignment: { ...PROPOSED.assignment }, notes: {} }];

    expect(isPrefillShowing(draft, PROPOSED)).toBe(true);
  });

  it("đề xuất bỏ hết người vì cả đội nghỉ thì vẫn hiện", () => {
    const empty = proposal({ "team-1-pos-1": null });
    const draft = [{ assignment: { "team-1-pos-1": null }, notes: {} }];

    expect(isPrefillShowing(draft, empty)).toBe(true);
  });

  it("xoá hết ô thì tắt", () => {
    const draft = [{ assignment: { "team-1-pos-1": null }, notes: {} }];

    expect(isPrefillShowing(draft, PROPOSED)).toBe(false);
  });

  it("đổi người trong một ô thì tắt", () => {
    const draft = [
      { assignment: { ...PROPOSED.assignment, "team-1-pos-2": "char-9" }, notes: {} },
    ];

    expect(isPrefillShowing(draft, PROPOSED)).toBe(false);
  });

  it("thêm trận 2 thì tắt", () => {
    const match = { assignment: { ...PROPOSED.assignment }, notes: {} };

    expect(isPrefillShowing([match, match], PROPOSED)).toBe(false);
  });

  it("chưa có nháp, hoặc không có gì để chép, thì tắt", () => {
    expect(isPrefillShowing(undefined, PROPOSED)).toBe(false);
    expect(isPrefillShowing([{ assignment: {}, notes: {} }], null)).toBe(false);
  });
});
