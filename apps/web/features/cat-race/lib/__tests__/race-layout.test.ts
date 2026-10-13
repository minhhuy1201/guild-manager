import { describe, expect, it } from "vitest";

import { MAX_PACK_ROWS, laneSlots, packSlots, projectProgress } from "../race-layout";

const AREA = { width: 900, height: 420 };
const PHONE = { width: 360, height: 640 };

/**
 * @param count - How many keys
 * @returns `count` distinct keys
 */
function keys(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `k${index}`);
}

describe("packSlots", () => {
  it("uses at most 24 rows for 240 cats and keeps every slot inside the area", () => {
    const slots = packSlots(keys(240), AREA);
    const rows = new Set([...slots.values()].map((slot) => slot.y));

    expect(slots.size).toBe(240);
    expect(rows.size).toBeLessThanOrEqual(MAX_PACK_ROWS);
    for (const { x, y } of slots.values()) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(AREA.width);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(AREA.height);
    }
  });

  it("keeps every slot inside a 360px wide vertical track", () => {
    for (const { x, y } of packSlots(keys(240), PHONE, "vertical").values()) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(PHONE.width);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(PHONE.height);
    }
  });
});

describe("laneSlots", () => {
  it("spreads 8 cats evenly across the lanes", () => {
    const ys = [...laneSlots(keys(8), AREA).values()].map((slot) => slot.y);
    const gaps = ys.slice(1).map((y, index) => y - ys[index]);

    expect(new Set(gaps.map((gap) => gap.toFixed(6))).size).toBe(1);
  });
});

describe("projectProgress", () => {
  const view = { from: 0, to: 1 };

  it("runs top to bottom on a vertical track", () => {
    const start = projectProgress(0, 100, view, PHONE, "vertical");
    const end = projectProgress(1, 100, view, PHONE, "vertical");

    expect(start.y).toBeLessThan(end.y);
    expect(start.x).toBe(100);
  });

  it("runs left to right on a horizontal track", () => {
    expect(projectProgress(0, 50, view, AREA, "horizontal").x).toBeLessThan(
      projectProgress(1, 50, view, AREA, "horizontal").x
    );
  });
});
