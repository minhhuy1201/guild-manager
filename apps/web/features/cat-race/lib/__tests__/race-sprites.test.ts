// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SPRITE_COLUMNS, SPRITE_FRAMES, SPRITE_ROWS, catSprite } from "../race-sprites";

describe("sprite source", () => {
  it.each([0, 1] as const)("is a rectangle in running frame %i", (frame) => {
    for (const row of SPRITE_FRAMES[frame]) {
      expect(row).toHaveLength(SPRITE_COLUMNS);
    }
  });

  it("has the same height in both frames", () => {
    expect(SPRITE_FRAMES[0]).toHaveLength(SPRITE_FRAMES[1].length);
  });
});

describe("catSprite", () => {
  const fillRect = vi.fn();
  const getContext = vi.fn();

  beforeEach(() => {
    getContext.mockReturnValue({ fillRect, fillStyle: "" });
    HTMLCanvasElement.prototype.getContext = getContext as never;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sizes the canvas from the width and the sprite's aspect ratio", () => {
    const sprite = catSprite("#112233", 28, 0);

    expect(sprite.width).toBe(28);
    expect(sprite.height).toBe(Math.ceil((28 / SPRITE_COLUMNS) * SPRITE_ROWS));
  });

  it("scales the backing store by the device pixel ratio", () => {
    vi.stubGlobal("devicePixelRatio", 2);

    expect(catSprite("#445566", 28, 0).width).toBe(56);
  });

  it("falls back to a ratio of 1 when the browser reports none", () => {
    vi.stubGlobal("devicePixelRatio", 0);

    expect(catSprite("#778899", 14, 0).width).toBe(14);
  });

  it("draws once per colour, size and frame", () => {
    const first = catSprite("#aa0000", 20, 1);
    const calls = getContext.mock.calls.length;

    expect(catSprite("#aa0000", 20, 1)).toBe(first);
    expect(getContext).toHaveBeenCalledTimes(calls);
    expect(catSprite("#aa0000", 20, 0)).not.toBe(first);
  });

  it("paints every non-empty pixel in the right colours", () => {
    const fills: string[] = [];
    const context = {
      fillRect,
      set fillStyle(value: string) {
        fills.push(value);
      },
    };
    getContext.mockReturnValue(context);

    catSprite("#bb0000", 21, 0);

    expect(new Set(fills)).toEqual(new Set(["#bb0000", "#2a2433", "#ffffff", "#ff8fa3"]));
  });

  it("never makes a zero-width sprite", () => {
    expect(catSprite("#cc0000", 0, 0).width).toBe(1);
  });

  it("returns the blank canvas when there is no 2D context", () => {
    getContext.mockReturnValue(null);

    const sprite = catSprite("#dd0000", 30, 0);

    expect(sprite.width).toBe(30);
    expect(fillRect).not.toHaveBeenCalled();
  });
});
