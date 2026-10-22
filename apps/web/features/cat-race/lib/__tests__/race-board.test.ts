import { describe, expect, it } from "vitest";

import { EMPTY_BOARD, advanceBoard, gapLabel, moveOf, standingsAt } from "../race-board";
import { laneLayout } from "../race-layout";
import { buildRaceScript, rankAt } from "../race-script";

const LAYOUT = laneLayout(4, { width: 800, height: 400 });

const SCRIPT = buildRaceScript({
  entrants: ["c0", "c1", "c2", "c3"].map((characterId) => ({ characterId, tickets: 1 })),
  winner: { characterId: "c0", ticketNo: 1 },
  durationSeconds: 12,
  random: () => 0.5,
});

describe("standingsAt", () => {
  it("lists the cats in the order the track ranks them, the leader at no gap", () => {
    const rows = standingsAt(SCRIPT, 0.6, LAYOUT);

    expect(rows.map((row) => row.key)).toEqual(rankAt(SCRIPT, 0.6));
    expect(rows[0]?.lengthsBehind).toBe(0);
  });

  it("measures every other gap in cat bodies, never negative and growing down the board", () => {
    const gaps = standingsAt(SCRIPT, 0.6, LAYOUT).map((row) => row.lengthsBehind!);

    expect(gaps.every((gap) => gap >= 0)).toBe(true);
    expect(gaps).toEqual([...gaps].sort((a, b) => a - b));
  });

  it("leaves the gaps unmeasured without a layout", () => {
    expect(standingsAt(SCRIPT, 1, null).every((row) => row.lengthsBehind === null)).toBe(true);
  });
});

describe("moveOf", () => {
  const previous = ["a", "b", "c"];

  it("is up for a cat that climbed and down for one that fell", () => {
    expect(moveOf(previous, "c", 1)).toBe("up");
    expect(moveOf(previous, "a", 1)).toBe("down");
  });

  it("is null for a cat that held its place or is new", () => {
    expect(moveOf(previous, "b", 1)).toBeNull();
    expect(moveOf(previous, "z", 0)).toBeNull();
    expect(moveOf([], "a", 0)).toBeNull();
  });
});

describe("gapLabel", () => {
  it("writes the gap with a minus, one decimal and a comma", () => {
    expect(gapLabel({ key: "a", lengthsBehind: 1.24 }, 1)).toBe("-1,2");
    expect(gapLabel({ key: "a", lengthsBehind: 0 }, 2)).toBe("-0,0");
  });

  it("is empty for the leader and for an unmeasured gap", () => {
    expect(gapLabel({ key: "a", lengthsBehind: 0 }, 0)).toBe("");
    expect(gapLabel({ key: "a", lengthsBehind: null }, 3)).toBe("");
  });
});

describe("advanceBoard", () => {
  it("keeps the order it replaces for the arrows to compare against", () => {
    const first = advanceBoard(EMPTY_BOARD, [{ key: "a", lengthsBehind: 0 }, { key: "b", lengthsBehind: 1 }]);
    const second = advanceBoard(first, [{ key: "b", lengthsBehind: 0 }, { key: "a", lengthsBehind: 1 }]);

    expect(first.previousKeys).toEqual([]);
    expect(second.previousKeys).toEqual(["a", "b"]);
  });
});
