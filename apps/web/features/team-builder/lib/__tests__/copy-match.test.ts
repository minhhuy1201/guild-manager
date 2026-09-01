import { describe, expect, it } from "vitest";

import type { MatchDraft, Slot } from "../../types/formation";
import { copyMatch } from "../copy-match";

const SLOTS: Slot[] = [
  { id: "team-1-pos-1", team: 1, position: 1 },
  { id: "team-1-pos-2", team: 1, position: 2 },
  { id: "team-1-pos-3", team: 1, position: 3 },
];

const SOURCE: MatchDraft = {
  assignment: {
    "team-1-pos-1": "char-1",
    "team-1-pos-2": "char-2",
    "team-1-pos-3": null,
  },
  notes: { "team-1-pos-2": "giữ cửa" },
};

describe("copyMatch", () => {
  it("giữ đúng vị trí của người vẫn đánh trận này", () => {
    const result = copyMatch(SOURCE, new Set(["char-1", "char-2"]), SLOTS);

    expect(result.assignment).toEqual({
      "team-1-pos-1": "char-1",
      "team-1-pos-2": "char-2",
      "team-1-pos-3": null,
    });
    expect(result.droppedCount).toBe(0);
  });

  it("bỏ người không điểm danh và đếm số người bị bỏ", () => {
    const result = copyMatch(SOURCE, new Set(["char-1"]), SLOTS);

    expect(result.assignment["team-1-pos-2"]).toBeNull();
    expect(result.droppedCount).toBe(1);
  });

  it("giữ ghi chú của ô ngay cả khi người ở ô đó bị bỏ", () => {
    const result = copyMatch(SOURCE, new Set([]), SLOTS);

    expect(result.notes).toEqual({ "team-1-pos-2": "giữ cửa" });
  });

  it("mọi ô của bố cục đều có khoá, kể cả ô nguồn không nhắc tới", () => {
    const result = copyMatch(
      { assignment: { "team-1-pos-1": "char-1" }, notes: {} },
      new Set(["char-1"]),
      SLOTS
    );

    expect(Object.keys(result.assignment)).toEqual([
      "team-1-pos-1",
      "team-1-pos-2",
      "team-1-pos-3",
    ]);
  });

  it("không sửa trận nguồn", () => {
    const source: MatchDraft = {
      assignment: { "team-1-pos-1": "char-1" },
      notes: { "team-1-pos-1": "note" },
    };
    copyMatch(source, new Set([]), SLOTS);

    expect(source.assignment).toEqual({ "team-1-pos-1": "char-1" });
    expect(source.notes).toEqual({ "team-1-pos-1": "note" });
  });
});
