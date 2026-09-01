import { describe, expect, it } from "vitest";

import type { Assignment, MatchDraft, Slot } from "../../types/formation";
import {
  fromWire,
  fromWireMatches,
  fromWireNotes,
  toWireMatches,
} from "../wire";

const SLOTS: Slot[] = [
  { id: "team-1-pos-1", team: 1, position: 1 },
  { id: "team-1-pos-2", team: 1, position: 2 },
  { id: "team-1-pos-3", team: 1, position: 3 },
];

/**
 * Run a formation through `toWireMatches` and take the first match's slots — the only path the app
 * uses to push a formation to the server.
 * @param assignment - Formation to convert
 * @returns The `slots` that would be sent
 */
function toWireSlots(assignment: Assignment) {
  return toWireMatches([{ assignment, notes: {} }])[0].slots;
}

/**
 * Run notes through `toWireMatches` and take the first match's notes.
 * @param notes - Notes to convert
 * @returns The `notes` that would be sent
 */
function toWireNotesOf(notes: Record<string, string>) {
  return toWireMatches([{ assignment: {}, notes }])[0].notes;
}

describe("toWireMatches — phần đội hình", () => {
  it("bỏ mọi ô trống", () => {
    const assignment: Assignment = {
      "team-1-pos-1": "char-1",
      "team-1-pos-2": null,
      "team-1-pos-3": "char-3",
    };

    expect(toWireSlots(assignment)).toEqual({
      "team-1-pos-1": "char-1",
      "team-1-pos-3": "char-3",
    });
  });

  it("đội hình trống thành object rỗng", () => {
    expect(toWireSlots({ "team-1-pos-1": null })).toEqual({});
  });
});

describe("fromWire", () => {
  it("dựng lại đủ khoá cho mọi ô, ô thiếu thành null", () => {
    expect(fromWire({ "team-1-pos-2": "char-2" }, SLOTS)).toEqual({
      "team-1-pos-1": null,
      "team-1-pos-2": "char-2",
      "team-1-pos-3": null,
    });
  });

  it("bỏ qua khoá không khớp ô nào của bố cục hiện tại", () => {
    const result = fromWire({ "team-99-pos-9": "char-1" }, SLOTS);

    expect(result).not.toHaveProperty("team-99-pos-9");
    expect(Object.keys(result)).toHaveLength(SLOTS.length);
  });

  it("đi vòng lên server rồi về lại giữ nguyên nội dung", () => {
    const original: Assignment = {
      "team-1-pos-1": "char-1",
      "team-1-pos-2": null,
      "team-1-pos-3": "char-3",
    };

    expect(fromWire(toWireSlots(original), SLOTS)).toEqual(original);
  });
});

describe("toWireMatches — phần ghi chú", () => {
  it("bỏ khoá của ghi chú rỗng và ghi chú chỉ có khoảng trắng", () => {
    expect(
      toWireNotesOf({
        "team-1-pos-1": "giữ buồng",
        "team-1-pos-2": "",
        "team-1-pos-3": "   ",
      })
    ).toEqual({ "team-1-pos-1": "giữ buồng" });
  });

  it("cắt khoảng trắng thừa hai đầu", () => {
    expect(toWireNotesOf({ "team-1-pos-1": "  vào sau  " })).toEqual({
      "team-1-pos-1": "vào sau",
    });
  });
});

describe("fromWireNotes", () => {
  it("bỏ ghi chú của slotId không còn trong bố cục", () => {
    expect(
      fromWireNotes(
        { "team-1-pos-1": "giữ buồng", "team-9-pos-9": "ô đã biến mất" },
        SLOTS
      )
    ).toEqual({ "team-1-pos-1": "giữ buồng" });
  });
});

describe("toWireMatches", () => {
  it("bỏ ô trống và ghi chú rỗng của từng trận, giữ nguyên thứ tự", () => {
    const matches: MatchDraft[] = [
      {
        assignment: { "team-1-pos-1": "char-1", "team-1-pos-2": null },
        notes: { "team-1-pos-1": "giữ buồng", "team-1-pos-2": "" },
      },
      {
        assignment: { "team-1-pos-1": null, "team-1-pos-2": "char-2" },
        notes: {},
      },
    ];

    expect(toWireMatches(matches)).toEqual([
      {
        slots: { "team-1-pos-1": "char-1" },
        notes: { "team-1-pos-1": "giữ buồng" },
      },
      { slots: { "team-1-pos-2": "char-2" }, notes: {} },
    ]);
  });

  it("bỏ trận 2 không còn ai trước khi gửi lên server", () => {
    const matches: MatchDraft[] = [
      { assignment: { "team-1-pos-1": "char-1" }, notes: {} },
      { assignment: { "team-1-pos-1": null }, notes: { "team-1-pos-1": "x" } },
    ];

    expect(toWireMatches(matches)).toEqual([
      { slots: { "team-1-pos-1": "char-1" }, notes: {} },
    ]);
  });
});

describe("fromWireMatches", () => {
  it("ngày chưa xếp gì vẫn cho một trận rỗng", () => {
    const result = fromWireMatches([], SLOTS);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      assignment: {
        "team-1-pos-1": null,
        "team-1-pos-2": null,
        "team-1-pos-3": null,
      },
      notes: {},
    });
  });

  it("dựng lại ghi chú đúng ô của từng trận", () => {
    const result = fromWireMatches(
      [
        {
          slots: { "team-1-pos-1": "char-1" },
          notes: { "team-1-pos-3": "chừa cho X" },
        },
        {
          slots: { "team-1-pos-2": "char-2" },
          notes: { "team-1-pos-1": "vào sau" },
        },
      ],
      SLOTS
    );

    expect(result[0].assignment["team-1-pos-1"]).toBe("char-1");
    expect(result[0].notes).toEqual({ "team-1-pos-3": "chừa cho X" });
    expect(result[1].assignment["team-1-pos-2"]).toBe("char-2");
    expect(result[1].notes).toEqual({ "team-1-pos-1": "vào sau" });
  });

  it("bỏ trận 2 đã lưu mà không còn ai đứng trong đó", () => {
    const result = fromWireMatches(
      [
        { slots: { "team-1-pos-1": "char-1" }, notes: {} },
        { slots: {}, notes: { "team-1-pos-1": "vào sau" } },
      ],
      SLOTS
    );

    expect(result).toHaveLength(1);
    expect(result[0].assignment["team-1-pos-1"]).toBe("char-1");
  });
});
