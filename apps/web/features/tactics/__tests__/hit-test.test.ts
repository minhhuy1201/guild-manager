import { describe, expect, it } from "vitest";
import type { TacticStage } from "@guild/shared/schemas";

import { hitTest } from "../lib/hit-test";

const stage: TacticStage = {
  id: "s1",
  name: "Giai đoạn 1",
  elements: [
    {
      kind: "token",
      id: "tk1",
      label: "Đội công",
      icon: "swords",
      x: 100,
      y: 100,
      size: "md",
      color: "red",
    },
    {
      kind: "freehand",
      id: "fh1",
      points: [400, 400, 500, 400],
      color: "blue",
      strokeWidth: 8,
    },
    {
      kind: "text",
      id: "tx1",
      x: 700,
      y: 700,
      text: "Tập kết",
      color: "black",
      fontSize: 24,
    },
  ],
};

describe("hitTest", () => {
  it("finds the token under the pointer", () => {
    expect(hitTest(stage, { x: 110, y: 105 })).toBe("tk1");
  });

  it("finds a freehand stroke the pointer is on", () => {
    expect(hitTest(stage, { x: 450, y: 402 })).toBe("fh1");
  });

  it("finds a note the pointer is on", () => {
    expect(hitTest(stage, { x: 710, y: 710 })).toBe("tx1");
  });

  it("returns null when the pointer is on empty map", () => {
    expect(hitTest(stage, { x: 1200, y: 900 })).toBeNull();
  });

  it("misses a stroke the pointer is well clear of", () => {
    expect(hitTest(stage, { x: 450, y: 460 })).toBeNull();
  });

  it("prefers the element drawn last when two overlap", () => {
    const overlapping: TacticStage = {
      ...stage,
      elements: [stage.elements[0], { ...stage.elements[0], id: "tk2" }],
    };

    expect(hitTest(overlapping, { x: 100, y: 100 })).toBe("tk2");
  });
});
