import { describe, expect, it } from "vitest";

import { SPRITE_COLUMNS, SPRITE_FRAMES } from "../race-sprites";

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
