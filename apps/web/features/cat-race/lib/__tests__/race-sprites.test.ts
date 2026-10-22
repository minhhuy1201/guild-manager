// @vitest-environment jsdom
import { GuildClass } from "@guild/shared/enums";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { catSprite } from "../race-sprites";
import { SPRITE_COLUMNS, SPRITE_ROWS } from "../sprite-rows";

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
    const sprite = catSprite(GuildClass.CUU_LINH, 28, 0);

    expect(sprite.width).toBe(28);
    expect(sprite.height).toBe(Math.ceil((28 / SPRITE_COLUMNS) * SPRITE_ROWS));
  });

  it("scales the backing store by the device pixel ratio", () => {
    vi.stubGlobal("devicePixelRatio", 2);

    expect(catSprite(GuildClass.HUYET_HA, 28, 0).width).toBe(56);
  });

  it("falls back to a ratio of 1 when the browser reports none", () => {
    vi.stubGlobal("devicePixelRatio", 0);

    expect(catSprite(GuildClass.LONG_NGAM, 14, 0).width).toBe(14);
  });

  it("draws once per class, size and frame", () => {
    const first = catSprite(GuildClass.THAN_TUONG, 20, 1);
    const calls = getContext.mock.calls.length;

    expect(catSprite(GuildClass.THAN_TUONG, 20, 1)).toBe(first);
    expect(getContext).toHaveBeenCalledTimes(calls);
    expect(catSprite(GuildClass.THAN_TUONG, 20, 2)).not.toBe(first);
    expect(catSprite(GuildClass.THAN_TUONG, 21, 1)).not.toBe(first);
    expect(catSprite(GuildClass.THIET_Y, 20, 1)).not.toBe(first);
  });

  it("paints the body, the stripes, the features and the accessory in their colours", () => {
    const fills: string[] = [];
    getContext.mockReturnValue({
      fillRect,
      set fillStyle(value: string) {
        fills.push(value);
      },
    });

    catSprite(GuildClass.TOAI_MONG, 21, 0);

    expect(new Set(fills)).toEqual(new Set(["#BDD6EE", "#889aab", "#221a26", "#ffffff", "#ff8fa3", "#f6efc4"]));
  });

  it("never makes a zero-width sprite", () => {
    expect(catSprite(GuildClass.TO_VAN, 0, 0).width).toBe(1);
  });

  it("returns the blank canvas when there is no 2D context", () => {
    getContext.mockReturnValue(null);
    fillRect.mockClear();

    const sprite = catSprite(GuildClass.TO_VAN, 30, 3);

    expect(sprite.width).toBe(30);
    expect(fillRect).not.toHaveBeenCalled();
  });
});
