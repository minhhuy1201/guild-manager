import { describe, expect, it } from "vitest";
import type { TacticElement, TacticStage } from "@guild/shared/schemas";

import {
  elementBounds,
  hitTest,
  isElementHit,
} from "../lib/element-geometry";
import { TOKEN_RADIUS } from "../lib/token-icon";

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

const token: TacticElement = {
  kind: "token",
  id: "e1",
  x: 400,
  y: 200,
  size: "md",
  icon: "swords",
  label: "",
  color: "blue",
};

describe("elementBounds(…)", () => {
  it("wraps a token in its own circle", () => {
    expect(elementBounds(token)).toEqual({
      centerX: 400,
      top: 200 - TOKEN_RADIUS.md,
      bottom: 200 + TOKEN_RADIUS.md,
    });
  });

  it("leaves room for a token's label under the circle", () => {
    const labelled = { ...token, label: "Đội 1" } as TacticElement;

    expect(elementBounds(labelled).bottom).toBeGreaterThan(
      elementBounds(token).bottom
    );
  });

  it("grows a token's box with its size", () => {
    const large = { ...token, size: "lg" } as TacticElement;

    expect(elementBounds(large).bottom).toBeGreaterThan(
      elementBounds(token).bottom
    );
  });

  it("puts a note's box around the line of text", () => {
    const note: TacticElement = {
      kind: "text",
      id: "e2",
      x: 100,
      y: 300,
      text: "Tập kết",
      fontSize: 24,
      color: "red",
    };

    const bounds = elementBounds(note);

    expect(bounds.top).toBe(300);
    expect(bounds.bottom).toBe(324);
    expect(bounds.centerX).toBeGreaterThan(100);
  });

  it("wraps a stroke in the box of its points, whichever way it was drawn", () => {
    const freehand: TacticElement = {
      kind: "freehand",
      id: "e3",
      points: [100, 400, 300, 200],
      strokeWidth: 4,
      color: "black",
    };

    expect(elementBounds(freehand)).toEqual({
      centerX: 200,
      top: 200,
      bottom: 400,
    });
  });

  it("wraps an arrow in the box of its two ends", () => {
    const arrow: TacticElement = {
      kind: "arrow",
      id: "e4",
      points: [500, 100, 700, 300],
      strokeWidth: 4,
      color: "yellow",
    };

    expect(elementBounds(arrow)).toEqual({
      centerX: 600,
      top: 100,
      bottom: 300,
    });
  });
});

describe("isElementHit and elementBounds together", () => {
  it.each(stage.elements.map((element) => [element.kind, element] as const))(
    "hits a %s where its action bar anchors, so what can be clicked and what the bar hangs off agree",
    (_kind, element) => {
      const bounds = elementBounds(element);
      const middle = { x: bounds.centerX, y: (bounds.top + bounds.bottom) / 2 };

      // A token's box reaches down over its label, which is not part of what a click picks up, so
      // its middle is taken from the circle alone.
      const probe =
        element.kind === "token" ? { x: element.x, y: element.y } : middle;

      expect(isElementHit(element, probe)).toBe(true);
    }
  );
});
