import { describe, expect, it } from "vitest";

import type { Assignment, Slot } from "../../types/formation";
import { fromWire, toWire } from "../wire";

const SLOTS: Slot[] = [
  { id: "team-1-pos-1", team: 1, position: 1 },
  { id: "team-1-pos-2", team: 1, position: 2 },
  { id: "team-1-pos-3", team: 1, position: 3 },
];

describe("toWire", () => {
  it("bỏ mọi ô trống", () => {
    const assignment: Assignment = {
      "team-1-pos-1": "char-1",
      "team-1-pos-2": null,
      "team-1-pos-3": "char-3",
    };

    expect(toWire(assignment)).toEqual({
      "team-1-pos-1": "char-1",
      "team-1-pos-3": "char-3",
    });
  });

  it("đội hình trống thành object rỗng", () => {
    expect(toWire({ "team-1-pos-1": null })).toEqual({});
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

  it("đi vòng toWire → fromWire giữ nguyên nội dung", () => {
    const original: Assignment = {
      "team-1-pos-1": "char-1",
      "team-1-pos-2": null,
      "team-1-pos-3": "char-3",
    };

    expect(fromWire(toWire(original), SLOTS)).toEqual(original);
  });
});
