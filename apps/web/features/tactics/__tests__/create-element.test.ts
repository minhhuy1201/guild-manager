import { describe, expect, it } from "vitest";

import {
  createArrow,
  createFreehand,
  createText,
  createToken,
  extendFreehand,
  pointArrow,
} from "../lib/create-element";

describe("element factories", () => {
  it("drops a token at the pointer, in the toolbar's colour", () => {
    const token = createToken(
      { label: "Đội công", icon: "swords" },
      { x: 100, y: 200 },
      "blue"
    );

    expect(token).toMatchObject({
      kind: "token",
      label: "Đội công",
      icon: "swords",
      x: 100,
      y: 200,
      size: "md",
      color: "blue",
    });
    expect(token.id).toBeTypeOf("string");
  });

  it("starts an arrow as a zero-length segment at the pointer", () => {
    expect(createArrow({ x: 10, y: 20 }, "red", 4).points).toEqual([
      10, 20, 10, 20,
    ]);
  });

  it("points an arrow at the pointer without moving its tail", () => {
    const arrow = pointArrow(createArrow({ x: 10, y: 20 }, "red", 4), {
      x: 50,
      y: 60,
    });

    expect(arrow.points).toEqual([10, 20, 50, 60]);
  });

  it("starts a freehand stroke with the first point twice, so a dot still draws", () => {
    expect(createFreehand({ x: 5, y: 6 }, "white", 8).points).toEqual([
      5, 6, 5, 6,
    ]);
  });

  it("appends to a freehand stroke", () => {
    const stroke = extendFreehand(createFreehand({ x: 5, y: 6 }, "white", 8), {
      x: 7,
      y: 8,
    });

    expect(stroke.points).toEqual([5, 6, 5, 6, 7, 8]);
  });

  it("stops appending once the stroke is at its point limit", () => {
    let stroke = createFreehand({ x: 0, y: 0 }, "white", 8);
    for (let step = 0; step < 4100; step += 1) {
      stroke = extendFreehand(stroke, { x: step, y: step });
    }

    expect(stroke.points.length).toBeLessThanOrEqual(8000);
  });

  it("writes a note at the pointer", () => {
    expect(createText({ x: 3, y: 4 }, "Tập kết", "yellow")).toMatchObject({
      kind: "text",
      x: 3,
      y: 4,
      text: "Tập kết",
      color: "yellow",
    });
  });
});
