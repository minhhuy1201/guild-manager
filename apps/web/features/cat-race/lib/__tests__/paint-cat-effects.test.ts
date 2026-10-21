import { describe, expect, it } from "vitest";

import { paintCrown, paintDust, paintSpeedLines } from "../paint-cat-effects";

/** A context that only records the rectangles and the colour each was painted in. */
function recorder() {
  const painted: { fill: string; alpha: number; rect: number[] }[] = [];
  const state = { fillStyle: "", globalAlpha: 1 };
  const context = new Proxy(state, {
    get: (target, property) =>
      property === "fillRect"
        ? (...rect: number[]) => painted.push({ fill: target.fillStyle, alpha: target.globalAlpha, rect })
        : target[property as keyof typeof target],
    set: (target, property, value) => {
      target[property as keyof typeof target] = value as never;

      return true;
    },
  }) as unknown as CanvasRenderingContext2D;

  return { context, painted };
}

describe("paintCrown", () => {
  it("paints thirteen gold pixels and one red gem rising above the sprite", () => {
    const { context, painted } = recorder();

    paintCrown(context, { x: 100, top: 50, width: 40, catHeight: 30 });

    expect(painted.filter((p) => p.fill === "#f2c14e")).toHaveLength(13);
    expect(painted.filter((p) => p.fill === "#c8372d")).toHaveLength(1);
    expect(Math.min(...painted.map((p) => p.rect[1]))).toBeLessThan(50);
  });
});

describe("paintSpeedLines", () => {
  const cat = { x: 100, y: 40, width: 30, height: 20 };

  it("paints three streaks only above 1.12 times even pace", () => {
    const fast = recorder();
    const slow = recorder();

    paintSpeedLines(fast.context, cat, 1.3, 0);
    paintSpeedLines(slow.context, cat, 1.12, 0);

    expect(fast.painted).toHaveLength(3);
    expect(slow.painted).toHaveLength(0);
  });

  it("restores full opacity afterwards", () => {
    const { context } = recorder();

    paintSpeedLines(context, cat, 1.3, 0);

    expect(context.globalAlpha).toBe(1);
  });
});

describe("paintDust", () => {
  const puff = { x: 5, y: 80, vx: 0, vy: 0, size: 2, life: 0.25, maxLife: 0.5 };

  it("fades a particle with its age and subtracts the scroll", () => {
    const { context, painted } = recorder();

    paintDust(context, [puff], 30);

    expect(painted).toEqual([{ fill: "#c9a27a", alpha: 0.35, rect: [5, 50, 2, 2] }]);
  });

  it("paints nothing for no dust", () => {
    const { context, painted } = recorder();

    paintDust(context, [], 0);

    expect(painted).toEqual([]);
  });
});
