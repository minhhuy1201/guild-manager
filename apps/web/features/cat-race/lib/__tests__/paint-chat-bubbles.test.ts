import { describe, expect, it } from "vitest";

import { fadeAlpha, popScale } from "../paint-chat-bubbles";

describe("popScale", () => {
  it("springs from nothing over full size and settles at 1", () => {
    expect(popScale(0)).toBe(0);
    expect(popScale(0.096)).toBeCloseTo(1.12);
    expect(popScale(0.16)).toBe(1);
    expect(popScale(1)).toBe(1);
  });
});

describe("fadeAlpha", () => {
  it("stays opaque until the last quarter, then fades to nothing", () => {
    expect(fadeAlpha(0, 2)).toBe(1);
    expect(fadeAlpha(1.5, 2)).toBe(1);
    expect(fadeAlpha(1.75, 2)).toBeCloseTo(0.5);
    expect(fadeAlpha(2, 2)).toBe(0);
  });
});
